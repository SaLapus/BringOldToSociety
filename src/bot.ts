import * as Discord from "discord.js";
import { Events, GatewayIntentBits } from "discord.js";
import * as dotenv from "dotenv";

dotenv.config();

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
const victimId = process.env.VICTIM_ID as string;

Bot.on(Events.ClientReady, async (client) => {
  console.log("STARTED SEARCHING SANYA");
});

Bot.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  if (newState.member && newState.member?.id !== victimId) return;

  console.log("FIND VICTIM MOVEMENT");

  if (newState.channelId === voiceFromId) {
    console.log("GOT VICTIM INTO TRAP");

    const guild = Bot.guilds.cache.get(guildId);
    const voiceTo = guild?.channels.cache
      .filter((channel) => !!channel)
      .find(
        (channel) =>
          channel.type === Discord.ChannelType.GuildVoice &&
          channel.members.size > 0 &&
          channel.id !== voiceFromId
      );
    const victim = guild?.members.cache.get(victimId);

    console.log("MOVE VICTIM AWAY");

    if (voiceTo) await victim?.voice.setChannel(voiceTo.id);
  }
});

Bot.login("NDY4NTA3NTA0NTE5ODA2OTk2.W0z5nQ.3htfWvyZGw1RGD4EVaPwcWVcK40");
