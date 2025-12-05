import { json, type RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import OpenAI from 'openai';
import { getChatContext, parseActionButtons, cleanMessageContent } from '$lib/server/insights/chatContext';
import { getTopInsight } from '$lib/server/insights/insightEngine';

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
        const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
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

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages,
            max_tokens: 300,
            temperature: 0.7
        });

        const aiResponse = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        // Parse action buttons from response
        const actionButtons = parseActionButtons(aiResponse);
        const cleanContent = cleanMessageContent(aiResponse);

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

            return json({
                conversationId: conversation.id,
                messages: conversation.messages.reverse().map(m => ({
                    id: m.id,
                    role: m.role,
                    content: m.content,
                    actionButtons: m.action_buttons,
                    insightId: m.insight_id,
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
                return json({
                    conversationId: latestConversation.id,
                    messages: latestConversation.messages.reverse().map(m => ({
                        id: m.id,
                        role: m.role,
                        content: m.content,
                        actionButtons: m.action_buttons,
                        insightId: m.insight_id,
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

            const starterMessages = [
                {
                    id: -1,
                    role: 'assistant',
                    content: `${timeGreeting}! I'm Penny, your financial buddy.`,
                    actionButtons: null,
                    insightId: null,
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
