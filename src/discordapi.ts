import { APIMessage, APIGuild, APIChannel, APITextChannel } from 'discord-api-types/v10'

export class DiscordAPI {
    public static API_ENDPOINT = 'https://discord.com/api/v10';

    private token: string;

    constructor(token: string) {
        this.token = token;
    }

    async post_request(path: string, body: Object) {
        return this.do_request(path, 'POST', body);
    }

    async post_request_json(path: string, body: Object): Promise<any> {
        return this.post_request(path, body)
            .then((res: Response) => res.json());
    }

    async post_request_text(path: string, body: Object): Promise<string> {
        return this.post_request(path, body)
            .then((res: Response) => res.text());
    }

    async get_request(path: string) {
        return this.do_request(path, 'GET');
    }

    async get_request_json(path: string): Promise<any> {
        return this.get_request(path)
            .then((res: Response) => res.json());
    }

    async get_request_text(path: string): Promise<string> {
        return this.get_request(path)
            .then((res: Response) => res.text());
    }

    async do_request(path: string, method: string, body?: Object) {
        let headers = new Headers();
        headers.append('User-Agent', 'shiftkeybotCF');
        headers.append('Content-Type', 'application/json');
        headers.append('Authorization', `Bot ${this.token}`);

        return fetch(`${DiscordAPI.API_ENDPOINT}${path}`,
            {
                method: method, body: JSON.stringify(body),
                headers: headers
            });
    }

    async list_guilds(): Promise<APIGuild[]> {
        return this.get_request_json('/users/@me/guilds');
    }

    async guild_channels(guild: APIGuild): Promise<APIChannel[]> {
        return this.get_request_json(`/guilds/${guild.id}/channels`);
    }

    async list_channels() {
        const channelList: APIChannel[] = [];
        const guildList = await this.list_guilds();
        for (let guild of guildList) {
            let channels = await this.guild_channels(guild);
            channelList.push(...channels);
        }
        return channelList;
    }

    async send_message(channelId: string, message: APIMessage) {
        return this.post_request(`/channels/${channelId}/messages`, message)
    }

}