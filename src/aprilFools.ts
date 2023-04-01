import fs from "node:fs";
import path from "node:path";

import * as Discord from "discord.js";
import { Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../envs/april.env") });

const Bot = new Discord.Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,

    GatewayIntentBits.GuildVoiceStates,

    GatewayIntentBits.MessageContent,
  ],
});

const guildId = process.env.GUILD_ID!;

const untouchableCategoryId = process.env.UNTOUCHABLE_CATEGORY_ID!;

const channelTo = process.env.CHANNEL_TO!;
const messageChannel = process.env.MESSAGE_CHANNEL!;
const channelLog = process.env.CHANNEL_LOG!;

const byNravId = process.env.BYNRAV_ID!;

const escapesMap = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/escapesStats.json"), "utf-8")
);

const victimsTimeoutQueue = new Set<string>();
const escapesStatistics = new Map<string, number>(escapesMap);

setInterval(
  () =>
    fs.writeFileSync(
      path.join(__dirname, "../data/escapesStats.json"),
      JSON.stringify([...escapesStatistics]),
      "utf-8"
    ),
  5 * 6_000
);

Bot.on(Events.ClientReady, async () => {});

Bot.on(Events.MessageCreate, (message) => {
  if (Date.now() < 1680296400000) return;
  if (message.guildId !== guildId) return;
  if (!message.content.startsWith("!escapes")) return;

  const guild = Bot.guilds.cache.get(guildId);

  const escapesStatString = Array.from(escapesStatistics)
    .sort((a, b) => b[1] - a[1])
    .map(
      ([id, escapes], i) =>
        `#${i + 1}: ${guild?.members.cache.get(id)?.displayName} пытался сбежать **${escapes}** раз`
    )
    .join("\n");

  message.reply(escapesStatString);
});

Bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    // After 1 april
    if (Date.now() < 1680296400000) return;
    // In 1 guild
    if (newState.guild.id !== guildId) return;
    // Not came out from voice channel
    if (!newState.channelId) return;
    // Not came in directly to voice channel
    if (!oldState.channelId && newState.channelId === channelTo) return;
    // Not in save category
    if (newState.channel?.parent?.id === untouchableCategoryId) return;
    // Was any move
    if (oldState.channelId === newState.channelId) return;

    const victim = newState.member;

    const guild = Bot.guilds.cache.get(guildId);

    const msgChannel = guild?.channels.cache.get(messageChannel);
    const voiceTo = guild?.channels.cache.get(channelTo);

    if (!(voiceTo && victim && msgChannel)) return;

    await victim.voice.setChannel(voiceTo!.id);

    if (oldState.channelId === channelTo) {
      const victimStats = escapesStatistics.get(victim.id) ?? 0;

      escapesStatistics.set(victim.id, victimStats + 1);
    }

    // Silent timeout
    if (victimsTimeoutQueue.has(victim.id)) return;

    const messageToSend = chooseText(
      victim.id,
      escapesStatistics.get(victim.id) ?? 0,
      newState.channel?.members.size
    );

    victimsTimeoutQueue.add(victim.id);
    setTimeout(() => victimsTimeoutQueue.delete(victim.id), 10_000);

    const message = await (msgChannel as Discord.TextChannel).send(messageToSend);

    setTimeout(() => message.delete(), 2 * 60_000);
  } catch (e) {
    if (!(e instanceof Error)) return;
    console.error(e);
    const toLog = Bot.channels.cache.get(channelLog);
    if (toLog?.type !== Discord.ChannelType.GuildText) return;
    toLog.send(e.toString());
  }
});

/**
 *
 * @param id - ID of user to reply
 * @param escapes - Escapes from target channel to another
 * @param membersInChannel - Count of members in target channel
 * @returns {string}
 */
function chooseText(id: string, escapes: number, membersInChannel?: number): string {
  const getChoice = (texts: string[]) => texts[Math.floor(Math.random() * texts.length)];
  const emoji = (name: string) =>
    Bot.guilds.cache.get(guildId)?.emojis.cache.find((e) => e.name?.includes(name));

  let texts: string[] = [];

  /**
   * If there are 4+ members in voice, there are 33% to send this messsage
   */
  if (membersInChannel && membersInChannel > 3 && Math.floor(Math.random() * 9) > 5)
    return "Теперь я знаю, как себя чувствует килька в банке...";

  const mention = `<@${id}>`;

  /**
   * If user tryed escape to another voice channel N times
   */
  if (escapes === 0)
    texts = [
      `${mention}, нетушки.`,
      `${mention} испарился!`,
      `${mention} пропал!`,
      `${mention} исчез!`,
      `${mention} наелся и спит!\n.\n.\n.\nЧто?..`,
    ];
  else if (escapes === 1)
    texts = [
      `${mention}, не сбежишь.`,
      `${mention}, даже не пытайся.`,
      `${mention}, не-а.`,
      `${mention}, ты куда?`,
    ];
  else if (escapes === 2)
    texts = [
      `${mention}, а ты упертый!`,
      `${mention}, думал, со второго раза получится? Смешно!`,
      `${mention}, сиди спокойно, ладно?..`,
    ];
  else if (escapes === 3)
    texts = [
      `${mention}, в конце останется лишь один.`,
      `${mention}, ты либо необучаемый, либо старый.`,
    ];
  else
    texts = [
      `${mention}, в конце останется лишь один.`,
      `${mention}, живой или мёртвый — ты пойдёшь со мной. ${emoji("Pepe_Gun")}`,
      `${mention}, ты либо необучаемый, ${
        id === byNravId
          ? `либо старый. В твоем случае это одного и тоже.`
          : `либо сегодня твой день.`
      } ${emoji("Pepe_Clown")}`,
      `${mention}, ${
        id === byNravId ? `эх, Саня, ты такой красивый...` : `привет, красавчик`
      } ${emoji("Pepe_Gayshit")} `,
      `${mention}, у тебя спина белая. ${emoji("Pepe_Cringe")}`,
    ];

  /**
   * byNrav have always chance to get this message
   */
  if (id === byNravId)
    texts.push(`${mention}, мы не дадим тебе умереть одному! ${emoji("Pchela_Happy")}`);

  /**
   * Return random text from several variants
   */
  return getChoice(texts);
}

Bot.login(process.env.BOT_TOKEN as string);
