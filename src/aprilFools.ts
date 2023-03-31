import fs from "node:fs";

import * as Discord from "discord.js";
import { Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config({ path: "./envs/april.env" });

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
const channelTo = process.env.CHANNEL_TO!;
const messageChannel = process.env.MESSAGE_CHANNEL!;

const guildLog = process.env.GUILD_LOG!;
const channelLog = process.env.CHANNEL_LOG!;

const victimsTimeoutQueue = new Set<string>();

const escapesMap = JSON.parse(fs.readFileSync("./data/escapesStats.json", "utf-8"));
const escapesStatistics = new Map<string, number>(escapesMap);

setInterval(
  () =>
    fs.writeFileSync("./data/escapesStats.json", JSON.stringify([...escapesStatistics]), "utf-8"),
  5 * 6_000
);

Bot.on(Events.ClientReady, async () => {
  const toLog = Bot.channels.cache.get(channelLog);

  const guild = Bot.guilds.cache.get(guildLog);
  const emoji = guild?.emojis.cache.find((e) => e.name?.includes("Bee_Mad_Emote"));

  debugger;

  if (toLog?.type !== Discord.ChannelType.GuildText) return;

  const message = await toLog.send(`мы не дадим тебе умереть одному! :Bee_Mad_Emote:`);
});

Bot.on(Events.MessageCreate, (message) => {
  if (Date.now() < 1680296400000) return;
  if (message.guildId !== "426623216375693332") return;
  if (!message.content.startsWith("!escapes")) return;

  const guild = Bot.guilds.cache.get(guildId);

  const escapesStatString = Array.from(escapesStatistics)
    .sort((a, b) => a[1] - b[1])
    .map(
      ([id, escapes], i) =>
        `#${i + 1}: ${guild?.members.cache.get(id)?.displayName} пытался сбежать **${escapes}** раз`
    )
    .join("\n");

  message.reply(escapesStatString);
});

Bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    // if (Date.now() < 1680296400000) return;
    if (newState.guild.id !== "426623216375693332") return;
    if (!newState.channelId) return;
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

    if (victimsTimeoutQueue.has(victim.id)) return;

    const messageToSend = chooseText(
      victim.id,
      escapesStatistics.get(victim.id) ?? 0,
      newState.channel?.members.size
    );

    victimsTimeoutQueue.add(victim.id);
    setTimeout(() => victimsTimeoutQueue.delete(victim.id), 5_000);

    // const message = await (msgChannel as Discord.TextChannel).send(messageToSend);

    const toLog = Bot.channels.cache.get(channelLog);

    if (toLog?.type !== Discord.ChannelType.GuildText) return;

    const message = await toLog.send(messageToSend);

    setTimeout(() => message.delete(), 2 * 60_000);
  } catch (e) {
    console.log(e);
    const toLog = Bot.channels.cache.get(channelLog);
    if (toLog?.type === Discord.ChannelType.GuildText) {
      toLog.send(e as string);
    }
  }
});

function chooseText(id: string, escapes: number, membersInChannel?: number): string {
  const getChoice = (texts: string[]) => texts[Math.floor(Math.random() * texts.length)];
  const emoji = (name: string) =>
    Bot.guilds.cache.get(guildId)?.emojis.cache.find((e) => e.name?.includes(name));
    
  let texts: string[] = [];

  /**
   * If there 4+ members in voice, there are 33% to send this messsage
   */
  if (membersInChannel && membersInChannel > 3 && Math.floor(Math.random() * 9) > 5)
    return "Теперь я знаю, как себя чувствует килька в банке...";

  const mention = `<@${id}>`;

  if (escapes === 0)
    texts = [
      `${mention}, нетушки`,
      `${mention}, ты куда?`,
      `${mention} испарился!`,
      `${mention} пропал!`,
      `${mention} исчез!`,
      `${mention} наелся и спит!\n.\n.\n.\nЧто?..`,
    ];
  else if (escapes === 1)
    texts = [`${mention}, не сбежишь`, `${mention}, даже не пытайся`, `${mention}, не-а`];
  else if (escapes === 2)
    texts = [
      `${mention}, а ты упертый!`,
      `${mention}, думал, со второго раза получится? Смешно!`,
      `${mention}, сиди спокойно, ладно?..`,
    ];
  else if (escapes === 3)
    texts = [
      `${mention}, в конце останется лишь один`,
      `${mention}, ты либо необучаемый, либо старый.`,
    ];
  else
    texts = [
      `${mention}, в конце останется лишь один`,
      `${mention}, живой или мёртвый — ты пойдёшь со мной`,
      `${mention}, ты либо необучаемый, либо старый. ${
        id === "327480736829669386" ? `В твоем случае это одного и тоже.` : ``
      }`,
      `${mention}, ${
        id === "327480736829669386"
          ? `Эх, Саня, ты такой красивый... :heart:`
          : `Привет, красавчик :heart:`
      }`,
    ];

  if (id === "327480736829669386")
    texts.push(`${mention}, мы не дадим тебе умереть одному! ${emoji("Pchela_Happy")}`);

  return getChoice(texts);
}

Bot.login(process.env.BOT_TOKEN as string);
