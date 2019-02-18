import { Controller } from 'egg';

// http://wxopen.imprexion.cn/wxopen?signature=879da4b1b2614c1143d8b8dc871b44dc14fc17cb&
// timestamp=1550050048&nonce=632107448&encrypt_type=aes&
// msg_signature=e512c3417e53623fd684d12fc29a871552f42af0

export default class WxOpenController extends Controller {

    /**
     * 获取第三方加密 component_verify_ticket 微信服务器每10分钟回调一次
     * 将最新的ticket存放进redis中
     *
     * @memberof WxOpenController
     */
    public async setComponentVerifyTicket() {
        const { app, ctx } = this;
        const res = await app.xml2json(ctx);

        if (res.xml.ComponentVerifyTicket) {
            // 每十分钟的微信回调ticket
            await ctx.service.wxopen.setComponentVerifyTicket(res.xml.ComponentVerifyTicket);
        } else if (res.xml.InfoType) {
            switch (res.xml.InfoType) {
                case 'authorized':
                    // 授权成功
                    await ctx.service.wxopen.postApiQueryAuth(res.xml.AuthorizationCode);
                    break;
                case 'unauthorized':
                    // 取消授权
                    break;
                case 'updateauthorized':
                    // 更新授权
                    await ctx.service.wxopen.postApiQueryAuth(res.xml.AuthorizationCode);
                    break;
                default: break;
            }

        }
        ctx.body = 'success';
    }

    /**
     * 将 component_verify_ticket 换成 component_access_token
     *
     * @memberof WxOpenController
     */
    public async getComponentAccessToken() {
        const { ctx } = this;
        ctx.body = await ctx.service.wxopen.getComponentAccessToken();
    }

    /**
     * 将加密ticket 解密出来
     *
     * @memberof WxOpenController
     */
    public async getTickt() {
        const { ctx } = this;
        // tslint:disable-next-line:max-line-length
        const encrypt = `4NL+fHzQu1ZCnqw5uHQ+CZWvrOmTbsux1rPSxjJoXZzLE7/BLfmbU+OU/C9whyJraDzQf9lWlpfveVc4afizAbDVzotdt6F+SHijvnl50VAm8HcWsql0/CSH6yAv6judwCVxc49+/RbJM72bkyUe9Cgy9DZlTjqd0+5GPHAeYCKis4qOyHLZNmjL+19oM+0jxekqVvEhfYDfKZJoqQdq6Adk6mU+6tfVasRj2ZM0PAJW7MweTPHCfqw3SyUp4LpsFEoq1coEqmJTOzT/GIIiSVuVlc3wX9bswJufQG7U0+pZKz6j6DkI/0WEYphllA1cJrlrGOlAXxo6PlL2bb+TVjGZ76PiRoFALmFYRRZRBp35C6RNexRHNLbBBgAknAkBiTBIqw0aWBFw/i8SkRfqxTc5VupE0SG+FvO4UI4cpp8v1MOPwMd6uKZ5ZN79Ne9flBpjU+RETfWoM5LFbgmTsA==`;
        const res = ctx.service.aes.decrypt(encrypt);
        ctx.response.set('Content-Type', 'text/xml');
        ctx.body = res;
    }

    /**
     *  获取预授权码
     *
     * @memberof WxOpenController
     */
    public async getPreAuthCode() {
        const { ctx } = this;
        ctx.body = await ctx.service.wxopen.postCreatePreauthcode();
    }

    public async postMessage() {
        const { app, ctx } = this;
        const res = await app.xml2json(ctx);

        const timeStamp = new Date().getTime();
        ctx.response.set('Content-Type', 'text/xml');
        let str = '';

        if (res.xml.MsgType === 'text' && res.xml.Content === 'TESTCOMPONENT_MSG_TYPE_TEXT') {

            /**
             * 1、模拟粉丝发送文本消息给专用测试公众号，第三方平台方需根据文本消息的内容进行相应的响应：
             *
             * 1）微信模推送给第三方平台方：文本消息，其中Content字段的内容固定为：TESTCOMPONENT_MSG_TYPE_TEXT
             *
             *  2）第三方平台方立马回应文本消息并最终触达粉丝：Content必须固定为：TESTCOMPONENT_MSG_TYPE_TEXT_callback
             */

            // tslint:disable-next-line:max-line-length
            str = `<xml><ToUserName><![CDATA[${res.xml.FromUserName}]]></ToUserName><FromUserName><![CDATA[${res.xml.ToUserName}]]></FromUserName><CreateTime>${timeStamp}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[TESTCOMPONENT_MSG_TYPE_TEXT_callback]]></Content><MsgId>${res.xml.MsgId}</MsgId></xml>`;
        } else if (res.xml.MsgType === 'text' && res.xml.Content.indexOf('QUERY_AUTH_CODE:') > -1) {

            /**
             * 2、模拟粉丝发送文本消息给专用测试公众号，第三方平台方需在5秒内返回空串表明暂时不回复，然后再立即使用客服消息接口发送消息回复粉丝
             *
             * 1）微信模推送给第三方平台方：文本消息，其中Content字段的内容固定为： QUERY_AUTH_CODE:$query_auth_code$（query_auth_code
             * 会在专用测试公众号自动授权给第三方平台方时，由微信后台推送给开发者）
             *
             * 2）第三方平台方拿到$query_auth_code$的值后，通过接口文档页中的“使用授权码换取公众号的授权信息”API，将$query_auth_code$的值赋值
             * 给API所需的参数authorization_code。然后，调用发送客服消息api回复文本消息给粉丝，其中文本消息的content字段设为：$query_auth_code$_from_api
             * （其中$query_auth_code$需要替换成推送过来的query_auth_code）
             */

            ctx.body = '';
            const queryAuthCode = res.xml.Content.replace('QUERY_AUTH_CODE:', '');
            await ctx.service.wxopen.postApiQueryAuth(queryAuthCode);
            await ctx.service.wxopen.postSendCustomMessage({
                touser: res.xml.FromUserName,
                msgtype: 'text',
                text: {
                    content: `${queryAuthCode}_from_api`,
                },
            });
            return;
        } else {
            // tslint:disable-next-line:max-line-length
            str = `<xml><ToUserName><![CDATA[${res.xml.FromUserName}]]></ToUserName><FromUserName><![CDATA[${res.xml.ToUserName}]]></FromUserName><CreateTime>${timeStamp}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[微信第三方开发平台：${res.xml.Content}]]></Content><MsgId>${res.xml.MsgId}</MsgId></xml>`;
        }
        ctx.body = ctx.service.aes.encrypt(str);
    }

    public async testRedis() {
        const { ctx, app } = this;
        await app.myRedis.set('foo', '1231');
        const res = await app.myRedis.get('foo');
        ctx.body = res;
    }
}
