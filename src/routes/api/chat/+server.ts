import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import OpenAI from 'openai';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { getChatContext, parseActionButtons, cleanMessageContent } from '$lib/server/insights/chatContext';
import { getTopInsight, getActiveInsights } from '$lib/server/insights/insightEngine';
import { CHAT_FUNCTIONS, MAX_FUNCTION_ROUNDS, executeFunction } from '$lib/server/insights/chatFunctions';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

export const POST: RequestHandler = async ({ request, locals }) => {
    const userId = locals.user?.id;
    if (!userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, conversationId } = body as { message: string; conversationId?: number };

    if (!message || typeof message !== 'string') {
        return json({ error: 'Message is required' }, { status: 400 });
    }

    try {
        // Get or create conversation
        let conversation;
        if (conversationId) {
            conversation = await db.chatConversation.findFirst({
                where: { id: conversationId, user_id: userId },
                include: { messages: { orderBy: { created_at: 'asc' }, take: 20 } }
            });
        }

        if (!conversation) {
            // Create new conversation with initial insight as first message
            const topInsight = await getTopInsight(userId, 'chat');

            conversation = await db.chatConversation.create({
                data: {
                    user_id: userId,
                    messages: {
                        create: topInsight ? {
                            role: 'assistant',
                            content: topInsight.message,
                            insight_id: topInsight.id,
                            action_buttons: topInsight.actionLabel && topInsight.actionHref
                                ? [{ label: topInsight.actionLabel, href: topInsight.actionHref }]
                                : null
                        } : undefined
                    }
                },
                include: { messages: { orderBy: { created_at: 'asc' } } }
            });
        }

        // Get chat context (system prompt with financial data)
        const { systemPrompt } = await getChatContext(userId);

        // Build message history for OpenAI
        const messages: ChatCompletionMessageParam[] = [
            { role: 'system', content: systemPrompt }
        ];

        // Add conversation history
        for (const msg of conversation.messages) {
            messages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content
            });
        }

        // Add new user message
        messages.push({ role: 'user', content: message });

        // Store user message
        await db.chatMessage.create({
            data: {
                conversation_id: conversation.id,
                role: 'user',
                content: message
            }
        });

        // Call OpenAI with function calling
        let completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            tools: CHAT_FUNCTIONS,
            tool_choice: 'auto',
            max_tokens: 500,
            temperature: 0.7
        });

        // Handle function calls (max 3 rounds)
        let responseMessage = completion.choices[0]?.message;
        let iterations = 0;

        while (responseMessage?.tool_calls && iterations < MAX_FUNCTION_ROUNDS) {
            // Add assistant message with tool calls to history
            messages.push(responseMessage);

            // Execute each function call
            for (const toolCall of responseMessage.tool_calls) {
                // Skip non-function tool calls
                if (toolCall.type !== 'function') continue;

                try {
                    const args = JSON.parse(toolCall.function.arguments);
                    const result = await executeFunction(toolCall.function.name, args, userId);

                    messages.push({
                        role: 'tool',
                        content: JSON.stringify(result),
                        tool_call_id: toolCall.id
                    });
                } catch (err) {
                    console.error(`Function ${toolCall.function.name} error:`, err);
                    messages.push({
                        role: 'tool',
                        content: JSON.stringify({ error: 'Function execution failed' }),
                        tool_call_id: toolCall.id
                    });
                }
            }

            // Get next response
            completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages,
                tools: CHAT_FUNCTIONS,
                tool_choice: 'auto',
                max_tokens: 500,
                temperature: 0.7
            });

            responseMessage = completion.choices[0]?.message;
            iterations++;
        }

        const aiResponse = responseMessage?.content || "Sorry, I couldn't generate a response.";

        // Parse action buttons from response
        let actionButtons = parseActionButtons(aiResponse);
        const cleanContent = cleanMessageContent(aiResponse);

        // AUTO-APPEND: If AI mentions action keywords but didn't include markers,
        // append the top active insight's CTA (skip cooldown since user is actively asking)
        const insights = await getActiveInsights(userId, 'chat', { skipCooldown: true });
        const actionKeywords = [
            // English
            'categorize', 'categorise', 'upload', 'recurring', 'subscription', 'transactions',
            // Dutch
            'categoriseren', 'categorie', 'uploaden', 'transacties', 'transactie', 'terugkerend', 'abonnement'
        ];
        const mentionsAction = actionKeywords.some(kw => aiResponse.toLowerCase().includes(kw));

        console.log('[CTA Debug] AI response:', aiResponse.substring(0, 100));
        console.log('[CTA Debug] Mentions action:', mentionsAction);
        console.log('[CTA Debug] Action buttons from parse:', actionButtons.length);
        console.log('[CTA Debug] Insights count:', insights.length);

        if (mentionsAction && actionButtons.length === 0) {
            // Find top action/urgent insight with a CTA
            const topActionInsight = insights.find(i =>
                (i.category === 'action' || i.category === 'urgent') &&
                i.actionLabel && i.actionHref
            );
            console.log('[CTA Debug] Top action insight:', topActionInsight?.id, topActionInsight?.actionLabel);
            if (topActionInsight) {
                actionButtons = [{ label: topActionInsight.actionLabel!, href: topActionInsight.actionHref! }];
            }
        }

        // Store assistant message
        const assistantMessage = await db.chatMessage.create({
            data: {
                conversation_id: conversation.id,
                role: 'assistant',
                content: cleanContent,
                action_buttons: actionButtons.length > 0 ? actionButtons : null
            }
        });

        // Update conversation timestamp
        await db.chatConversation.update({
            where: { id: conversation.id },
            data: { updated_at: new Date() }
        });

        return json({
            message: {
                id: assistantMessage.id,
                role: 'assistant',
                content: cleanContent,
                actionButtons: actionButtons.length > 0 ? actionButtons : null,
                createdAt: assistantMessage.created_at
            },
            conversationId: conversation.id
        });

    } catch (error) {
        console.error('Chat API error:', error);
        return json({ error: 'Failed to generate response' }, { status: 500 });
    }
};

// GET: Fetch conversation history
export const GET: RequestHandler = async ({ url, locals }) => {
    const userId = locals.user?.id;
    if (!userId) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const conversationId = url.searchParams.get('conversationId');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    try {
        if (conversationId) {
            // Get specific conversation with messages
            const conversation = await db.chatConversation.findFirst({
                where: { id: parseInt(conversationId), user_id: userId },
                include: {
                    messages: {
                        orderBy: { created_at: 'desc' },
                        take: limit,
                        skip: offset
                    }
                }
            });

            if (!conversation) {
                return json({ error: 'Conversation not found' }, { status: 404 });
            }

            // Lookup insight categories for messages with insight_id
            const insightIds = conversation.messages
                .map(m => m.insight_id)
                .filter((id): id is string => !!id);

            const insightDefs = insightIds.length > 0
                ? await db.insightDefinition.findMany({
                    where: { id: { in: insightIds } },
                    select: { id: true, category: true }
                })
                : [];

            const categoryMap = new Map(insightDefs.map(d => [d.id, d.category]));

            return json({
                conversationId: conversation.id,
                messages: conversation.messages.reverse().map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    actionButtons: m.action_buttons,
                    insightId: m.insight_id,
                    insightCategory: m.insight_id ? categoryMap.get(m.insight_id) : null,
                    createdAt: m.created_at
                })),
                hasMore: conversation.messages.length === limit
            });
        } else {
            // Get latest conversation or create starter
            const latestConversation = await db.chatConversation.findFirst({
                where: { user_id: userId },
                orderBy: { updated_at: 'desc' },
                include: {
                    messages: {
                        orderBy: { created_at: 'desc' },
                        take: limit
                    }
                }
            });

            if (latestConversation) {
                // Lookup insight categories for messages with insight_id
                const insightIds = latestConversation.messages
                    .map(m => m.insight_id)
                    .filter((id): id is string => !!id);

                const insightDefs = insightIds.length > 0
                    ? await db.insightDefinition.findMany({
                        where: { id: { in: insightIds } },
                        select: { id: true, category: true }
                    })
                    : [];

                const categoryMap = new Map(insightDefs.map(d => [d.id, d.category]));

                return json({
                    conversationId: latestConversation.id,
                    messages: latestConversation.messages.reverse().map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        actionButtons: m.action_buttons,
                        insightId: m.insight_id,
                        insightCategory: m.insight_id ? categoryMap.get(m.insight_id) : null,
                        createdAt: m.created_at
                    })),
                    hasMore: latestConversation.messages.length === limit
                });
            }

            // No conversation yet - return greeting + insight as starter
            const topInsight = await getTopInsight(userId, 'chat');
            const now = new Date();
            const hour = now.getHours();
            const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

            const starterMessages: Array<{
                id: number;
                role: string;
                content: string;
                actionButtons: Array<{ label: string; href: string }> | null;
                insightId: string | null;
                insightCategory: string | null;
                createdAt: Date;
            }> = [
                    {
                        id: -1,
                        role: 'assistant',
                        content: `${timeGreeting}! I'm Penny, your financial buddy.`,
                        actionButtons: null,
                        insightId: null,
                        insightCategory: null,
                        createdAt: now
                    }
                ];

            if (topInsight) {
                starterMessages.push({
                    id: 0,
                    role: 'assistant',
                    content: topInsight.message,
                    actionButtons: topInsight.actionLabel && topInsight.actionHref
                        ? [{ label: topInsight.actionLabel, href: topInsight.actionHref }]
                        : null,
                    insightId: topInsight.id,
                    insightCategory: topInsight.category,
                    createdAt: now
                });
            }

            return json({
                conversationId: null,
                messages: starterMessages,
                hasMore: false
            });
        }
    } catch (error) {
        console.error('Chat GET error:', error);
        return json({ error: 'Failed to fetch conversation' }, { status: 500 });
    }
};
