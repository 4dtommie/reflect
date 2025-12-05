import * as fs from 'fs';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { calculateBalanceData } from '$lib/server/recurring/balanceCalculator';
import { getTopInsight, getSpecificInsight } from '$lib/server/insights/insightEngine';

export const load: PageServerLoad = async ({ locals }) => {
	try { fs.appendFileSync('debug_log.txt', `[${new Date().toISOString()}] Load function started\n`); } catch { }

	const userId = locals.user!.id;

	const [
		recentTransactions,
		totalCount,
		categorizedCount,
		recurringTransactions,
		topUncategorizedMerchants,
		balanceData,
		chatInsight
	] = await Promise.all([
		db.transactions.findMany({
			where: { user_id: userId },
			orderBy: { date: 'desc' },
			take: 5,
			include: {
				categories: true,
				merchants: true
			}
		}),
		db.transactions.count({
			where: { user_id: userId }
		}),
		db.transactions.count({
			where: {
				user_id: userId,
				category_id: { not: null },
				categories: {
					name: { notIn: ['Niet gecategoriseerd', 'Uncategorized'] }
				}
			}
		}),
		db.recurringTransaction.findMany({
			where: {
				user_id: userId,
				status: 'active'
			},
			orderBy: { next_expected_date: 'asc' }
		}),
		db.transactions.groupBy({
			by: ['merchantName'],
			where: {
				user_id: userId,
				OR: [
					{ category_id: null },
					{ categories: { name: { in: ['Uncategorized', 'Niet gecategoriseerd'] } } }
				]
			},
			_count: {
				_all: true
			},
			orderBy: {
				_count: {
					merchantName: 'desc'
				}
			},
			take: 3
		}),
		calculateBalanceData(userId),
		getTopInsight(userId, 'chat')
	]);

	try { fs.appendFileSync('debug_log.txt', `[${new Date().toISOString()}] Promise.all completed - chatInsight: ${chatInsight?.id}\n`); } catch { }

	// Mutable insight to allow for success transitions
	let currentInsight = chatInsight;

	// Define success transitions: previous_insight_id -> success_insight_id
	const SUCCESS_TRANSITIONS: Record<string, string> = {
		'uncategorized_high': 'categorization_complete',
		'no_transactions': 'upload_complete'
	};

	// Smart Greeting Logic
	try {
		const user = await db.user.findUnique({ where: { id: userId } });
		if (user) {
			const now = new Date();
			const lastActive = new Date(user.last_active_at);
			const isSameDay = now.toDateString() === lastActive.toDateString();

			// Consider it a new visit if > 30 mins since last active
			const timeDiffCols = (now.getTime() - lastActive.getTime()) / (1000 * 60);
			const isNewSession = timeDiffCols > 30;

			let newVisitCount = isSameDay ? user.daily_visit_count : 0;

			if (isNewSession || !isSameDay) {
				newVisitCount++;

				// Update user activity
				await db.user.update({
					where: { id: userId },
					data: {
						last_active_at: now,
						daily_visit_count: newVisitCount
					}
				});

				// Determine greeting
				let greetingMessage = '';

				if (newVisitCount > 5) {
					// Funny greeting for frequent visitors
					const funnyGreetings = [
						"You really love checking your finances today! 😂",
						"Back again? Your money misses you too! 💸",
						"Penny here! Still counting those coins? 🍌",
						"I admire your dedication to dashboard gazing! 🌟",
						"5+ visits today! You're a power user (or just anxious? 😜)"
					];
					greetingMessage = funnyGreetings[Math.floor(Math.random() * funnyGreetings.length)];
				} else if (newVisitCount > 1) {
					// Welcome back greeting
					const backGreetings = [
						"Welcome back! 👋",
						"Good to see you again! ✨",
						"Penny here again! 🍌",
						"Checking in? I'm here! 🫡"
					];
					greetingMessage = backGreetings[Math.floor(Math.random() * backGreetings.length)];
				} else {
					// First visit of the day - managed by ChatWidget's default logic if empty, 
					// but here we can force a "Good morning" if chat exists
					const hour = now.getHours();
					const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
					greetingMessage = `${timeGreeting}! Ready to make some moves? 🚀`;
				}

				// Add greeting to chat if conversation exists
				// We don't create a new conversation here, just append if exists
				if (greetingMessage) {
					const conversation = await db.chatConversation.findFirst({
						where: { user_id: userId },
						orderBy: { updated_at: 'desc' }
					});

					if (conversation) {
						await db.chatMessage.create({
							data: {
								conversation_id: conversation.id,
								role: 'assistant',
								content: greetingMessage,
								created_at: now
							}
						});
					}
				}
			} else {
				// Just update timestamp for active session
				await db.user.update({
					where: { id: userId },
					data: { last_active_at: now }
				});
			}
		}

		// Insight Transition Logic - Check if Penny should say something new based on data changes
		try { fs.appendFileSync('debug_log.txt', `[${new Date().toISOString()}] Entering transition logic - currentInsight: ${currentInsight?.id}\n`); } catch { }

		if (currentInsight || Object.keys(SUCCESS_TRANSITIONS).length > 0) {
			let conversation = await db.chatConversation.findFirst({
				where: { user_id: userId },
				orderBy: { updated_at: 'desc' },
				include: { messages: { orderBy: { created_at: 'desc' }, take: 5 } }
			});

			// Create conversation if it doesn't exist (first visit)
			if (!conversation && currentInsight) {
				const now = new Date();
				const hour = now.getHours();
				const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

				conversation = await db.chatConversation.create({
					data: {
						user_id: userId,
						created_at: now,
						updated_at: now,
						messages: {
							create: {
								role: 'assistant',
								content: `${timeGreeting}! I'm Penny 🍌, your financial buddy.`,
								created_at: now
							}
						}
					},
					include: { messages: { orderBy: { created_at: 'desc' }, take: 5 } }
				});
				try { fs.appendFileSync('debug_log.txt', `[${new Date().toISOString()}] Created new conversation with greeting: ${conversation.id}\n`); } catch { }
			}

			try { fs.appendFileSync('debug_log.txt', `[${new Date().toISOString()}] Conversation found: ${!!conversation}, messages: ${conversation?.messages?.length}\n`); } catch { }

			if (conversation) {
				// Find the last message that was generated from an insight
				const lastInsightMsg = conversation.messages.find((m) => m.insight_id);
				try { fs.appendFileSync('debug_log.txt', `[${new Date().toISOString()}] lastInsightMsg: ${lastInsightMsg?.insight_id}\n`); } catch { }

				try {
					const fs = await import('node:fs');
					const log = (msg: string) => fs.appendFileSync('debug_log.txt', msg + '\n');

					log(`[${new Date().toISOString()}] 🔍 DEBUG: lastInsightMsg ID: ${lastInsightMsg?.insight_id}`);
					log(`[${new Date().toISOString()}] 🔍 DEBUG: currentInsight ID: ${currentInsight?.id}`);

					// Check if we should override with a success message
					if (lastInsightMsg && SUCCESS_TRANSITIONS[lastInsightMsg.insight_id]) {
						const successId = SUCCESS_TRANSITIONS[lastInsightMsg.insight_id];
						log(`[${new Date().toISOString()}] 🔍 DEBUG: Attempting transition to: ${successId}`);

						const successInsight = await getSpecificInsight(userId, successId);
						log(`[${new Date().toISOString()}] 🔍 DEBUG: getSpecificInsight result: ${successInsight?.id}`);

						if (successInsight) {
							currentInsight = successInsight;
						}
					}
				} catch (err) {
					console.error('Debug logging failed', err);
				}

				// If the current top insight is different from the last one we told the user
				if (currentInsight && (!lastInsightMsg || lastInsightMsg.insight_id !== currentInsight.id)) {
					// Add the celebration/current insight to the chat
					await db.chatMessage.create({
						data: {
							conversation_id: conversation.id,
							role: 'assistant',
							content: currentInsight.message,
							insight_id: currentInsight.id,
							action_buttons: currentInsight.actionLabel && currentInsight.actionHref
								? JSON.parse(JSON.stringify([{ label: currentInsight.actionLabel, href: currentInsight.actionHref }]))
								: null,
							created_at: new Date()
						}
					});

					// If this was a celebration (success transition), also show the next action
					if (currentInsight.category === 'celebration') {
						// Get the actual top insight (which would be the next action)
						const nextActionInsight = chatInsight; // This is the original top insight before override

						if (nextActionInsight && nextActionInsight.id !== currentInsight.id) {
							// Add a small delay to the timestamp so messages appear in correct order
							const nextTimestamp = new Date(Date.now() + 100);

							await db.chatMessage.create({
								data: {
									conversation_id: conversation.id,
									role: 'assistant',
									content: nextActionInsight.message,
									insight_id: nextActionInsight.id,
									action_buttons: nextActionInsight.actionLabel && nextActionInsight.actionHref
										? JSON.parse(JSON.stringify([{ label: nextActionInsight.actionLabel, href: nextActionInsight.actionHref }]))
										: null,
									created_at: nextTimestamp
								}
							});
						}
					}

					// Update conversation updated_at
					await db.chatConversation.update({
						where: { id: conversation.id },
						data: { updated_at: new Date() }
					});
				}
			}
		}
	} catch (e) {
		console.error('Error in smart greeting logic:', e);
	}

	return {
		recurringTransactions: recurringTransactions.map((t) => ({
			id: t.id,
			name: t.name,
			amount: Number(t.amount),
			interval: t.interval,
			status: t.status,
			next_expected_date: t.next_expected_date,
			merchant_id: t.merchant_id,
			category_id: t.category_id
		})),
		recentTransactions: recentTransactions.map((t) => ({
			id: t.id,
			merchant: t.merchants?.name || t.cleaned_merchant_name || t.merchantName || 'Unknown',
			amount: Number(t.amount),
			isDebit: t.is_debit,
			category: t.categories?.name || 'Uncategorized',
			categoryIcon: t.categories?.icon || null,
			date: t.date
		})),
		stats: {
			totalTransactions: totalCount,
			categorizedCount: categorizedCount,
			uncategorizedCount: totalCount - categorizedCount,
			categorizedPercentage: totalCount > 0 ? (categorizedCount / totalCount) * 100 : 0,
			topUncategorizedMerchants: topUncategorizedMerchants.map((r) => ({
				name: r.merchantName,
				count: r._count._all
			}))
		},
		balanceData,
		chatInsight: currentInsight
	};
};

