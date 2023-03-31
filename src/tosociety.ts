import * as Discord from "discord.js";
import { Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config({path: "./envs/old.env"});

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

const guildId = process.env.GUILD_ID as string;
const voiceFromId = process.env.VOICE_FROM_ID as string;
const channelToAlert = process.env.CHANNEL_TO_ALERT as string;
const victimId = process.env.VICTIM_ID as string;

Bot.on(Events.ClientReady, async (client) => {
  const guild = Bot.guilds.cache.get(guildId);
  const members = await guild?.members.fetch();
  const victim = members?.get(victimId);
  debugger;
  console.log("STARTED SEARCHING ", victim?.displayName);
});

Bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (newState.member && newState.member?.id !== victimId) return;

  // console.log("FIND VICTIM MOVEMENT");

  if (newState.channelId === voiceFromId) {
    // console.log("GOT VICTIM INTO TRAP");

    const guild = Bot.guilds.cache.get(guildId);
    const voiceTo = guild?.channels.cache
      .filter((channel) => !!channel)
      .find(
        (channel) =>
          channel.type === Discord.ChannelType.GuildVoice &&
          channel.members.size > 0 &&
          channel.id !== voiceFromId &&
          channel.id !== guild.afkChannelId
      );
    const victim = guild?.members.cache.get(victimId);

    // console.log("MOVE VICTIM AWAY");

    if (victim && voiceTo) {
      await victim.voice.setChannel(voiceTo.id);
      const channel = guild?.channels.cache.get(channelToAlert);
      (channel as Discord.TextChannel).send(`<@${victim.id}>, мы не дадим тебе умереть одному.`);
    }
  }
});

Bot.login(process.env.BOT_TOKEN as string);
