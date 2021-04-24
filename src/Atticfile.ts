import { promises as fs } from 'fs';
import {
    IIdentityEntity as
        IIdentityEntityBase
} from "@znetstar/attic-common/lib/IIdentity";

import {
    IAccessToken
} from "@znetstar/attic-common/lib/IAccessToken";

import { GenericError } from '@znetstar/attic-common/lib/Error/GenericError'
import fetch from "node-fetch";
import {IError} from "@znetstar/attic-common/lib/Error/IError";
import {IIdentity} from "@znetstar/attic-common";
import {IApplicationContext, IPlugin} from "@znetstar/attic-common/lib/Server";
import * as _ from 'lodash';

interface IIdentityEntityModel{
    externalId: string;
    otherFields?: any;
}

type IIdentityEntity = IIdentityEntityModel&IIdentityEntityBase&IIdentity;

export interface IWeChatAccessTokenExt {
    otherFields: {
        openid: string;
    }
}

export type IWeChatAccessToken = IAccessToken&IWeChatAccessTokenExt;

export class AtticServerWeChat implements IPlugin {
    constructor(public applicationContext: IApplicationContext) {

    }

    public getWeChatIdentity = async (accessToken: IWeChatAccessToken): Promise<IIdentityEntity> => {
            let resp = await fetch(`https://api.weixin.qq.com/sns/userinfo?openid=${accessToken.otherFields.openid}&access_token=${accessToken.token}`, {
            // headers: {
            //     'Authorization': `Bearer ${accessToken.token}`
            // }
        });

        let body:  any;
        let e2: any;
        try { body = await resp.json(); }
        catch (err) { e2 = err; }

        if (resp.status !== 200) {
            throw new GenericError(`Could not locate WeChat identity`,  2001, 403, (
                body || e2
            ) as any as IError);
        }


        let fields: IIdentityEntity = {
            firstName: body.nickname,
            clientName: accessToken.clientName,
            lastName: '',
            phone: '',
            email: `${body.openid}.wechat@${_.get(this, 'applicationContext.config.emailHostname') || process.env.EMAIL_HOSTNAME}`,
            otherFields: body,
            source: {
                href: `https://api.weixin.qq.com/sns/userinfo?openid=${body.openid}`
            },
            type: 'IdentityEntity',
            client: accessToken.client,
            user: null,
            externalId: body.openid,
            id: null,
            _id: null
        };

        return fields;
    }


    public async init(): Promise<void> {
        this.applicationContext.registerHook<IIdentityEntity>(`Client.getIdentityEntity.wechat.provider`, this.getWeChatIdentity);
    }

    public get name(): string {
        return JSON.parse((require('fs').readFileSync(require('path').join(__dirname, '..', 'package.json'), 'utf8'))).name;
    }
}

export default AtticServerWeChat;
