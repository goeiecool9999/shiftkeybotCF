import { Env } from './index'
import { parseDocument } from 'htmlparser2'
import { Element, AnyNode, Document } from 'domhandler'
import * as domutils from 'domutils'

import { DiscordAPI } from "./discordapi";
import { APIMessage, APIEmbed, ChannelType } from 'discord-api-types/v10';

type Tweet = {
    url: string
    content: string
};

let findShiftKeyChannels = async (discord: DiscordAPI) => {
    let channels: string[] = [];
    const channelObjectList = await discord.list_channels();
    for (const { id, type, name } of channelObjectList) {
        if (type !== ChannelType.GuildText || name !== "shift-codes") {
            continue;
        }
        channels.push(id);
    }
    return channels
}

let processTweets = async (tweets: Tweet[], env: Env) => {
    // prepare discord API
    const discord = new DiscordAPI(env.BOT_TOKEN);

    // find shift-codes channels
    const channels = await findShiftKeyChannels(discord);
    console.log(`eligible channels are: ${channels}`);

    // retrieve known codes from KV
    const knownCodes: string[] = await env.KNOWN_CODES.list()
        .then((l) => l.keys.map((k) => k.name));

    console.log(`known codes: ${knownCodes}`);

    console.log(`checking ${tweets.length} tweets for new codes`)
    //iterate tweets to discover new codes
    for (let tweet of tweets.reverse()) {
        const codeRE = /(?:[A-Z0-9]{5}-){4}[A-Z0-9]{5}/;
        const result = codeRE.exec(tweet.content);
        if (result === null)
            continue;

        // have we seen the code before?
        if (knownCodes.indexOf(result[0]) != -1)
            continue;

        console.log(`found code: ${result}`);

        // create key for this code
        await env.KNOWN_CODES.put(result[0], "");

        // send the messages
        const embed: APIEmbed = { title: "A new shift key was tweeted!", description: tweet.content, url: tweet.url };
        const messageTest = { embeds: [embed] } as APIMessage;

        for (let channel of channels) {
            console.log(`attempting send to ${channel}`)
            const fetchtest = await discord.send_message(channel, messageTest)
            if (fetchtest.status != 200) {
                console.log(`failed to send message with code ${fetchtest.status} due to ${await JSON.stringify(fetchtest.json())}`)
            }
        }

    }

}

let scrape_tweets = async (env: Env) => {

    console.log("starting scrape");

    let headers = new Headers();
    headers.append('User-Agent', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Googlebot/2.1; +http://www.google.com/bot.html) Chrome/83.0.4103.122 Safari/537.36')

    let findOneByTestId = (elem: AnyNode, value: string) => {
        return domutils.findOne((elem) => domutils.getAttributeValue(elem, 'data-testid') === value,
            [elem], true);
    }

    let findAllByTestId = (elem: AnyNode, value: string) => {
        return domutils.find((elem) => domutils.getAttributeValue(elem, 'data-testid') === value,
            [elem], true, 999);
    }

    let html = await fetch('https://twitter.com/DuvalMagic/', { headers: headers })
        .then((response: Response) => {
            console.log(`response from twitter: ${response.status}`)
            return response.text();
        });

    if (html === undefined)
        return;

    console.log("parsing HTML");
    let dom = parseDocument(html);
    let tweets = findAllByTestId(dom, 'tweet');
    if (!tweets.length) {
        console.log("did not find tweets in dom");
        return;
    }
    console.log(`scraped ${tweets.length} tweets`);

    let foundTweets: Tweet[] = [];

    for (let tweet of tweets) {
        // find the tweetText node
        let tweetTextNode = findOneByTestId(tweet, 'tweetText');
        if (!tweetTextNode) {
            console.log("tweet did not have text");
            continue;
        }

        // extract the actual text
        let tweetText = domutils.textContent(tweetTextNode.children);

        // look for tweet URL in User-Name tag
        let userNameDiv = findOneByTestId(tweet, 'User-Name');
        if (!userNameDiv) {
            console.log("tweet did not have User-Name tag");
            continue;
        }

        // find the link element which has status in it
        let tweetLinkRelative = domutils.getElementsByTagName('a', userNameDiv, true)
            .map((elem: Element) => domutils.getAttributeValue(elem, 'href'))
            .find((str) => str?.includes('status'));

        if (tweetLinkRelative === undefined) {
            console.log("tweet did not have link");
            continue;
        }
        let tweetLink = "https://twitter.com".concat(tweetLinkRelative);

        foundTweets.push({ url: tweetLink, content: tweetText });
    }

    await processTweets(foundTweets, env);

}

export { scrape_tweets }