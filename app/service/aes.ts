import { Service } from 'egg';

import XMLParser = require('xml2js');
import crypto = require('crypto');
import config from '../config';

export default class AesService extends Service {
    public decrypt(text: string) {
        const wxConfig = {
            // 传入配置信息
            token: config.token,
            appid: config.appid,
            msg_signature: config.msgSignature,
            encodingAESKey: config.encodingAESKey,
        };
        const wxCrypt = new WxCrypt(wxConfig);
        return wxCrypt.decrypt(text);
    }

    public encrypt(xmlMsg: string) {
        const wxConfig = {
            // 传入配置信息
            token: config.token,
            appid: config.appid,
            msg_signature: config.msgSignature,
            encodingAESKey: config.encodingAESKey,
        };
        const wxCrypt = new WxCrypt(wxConfig);
        return wxCrypt.encryptMsg(xmlMsg);
    }
}

class WxCrypt {
    token: any;
    appid: any;
    msgSignature: any;
    aesKey: any;
    IV: any;
    constructor(opts: any) {
        // 初始化需要用到的属性
        this.token = opts.token;
        this.appid = opts.appid;
        this.msgSignature = opts.msg_signature; // query 传进来签名
        this.aesKey = Buffer.from(opts.encodingAESKey + '=', 'base64');
        this.IV = this.aesKey.slice(0, 16);
    }

    encrypt(xmlMsg: string) {
        /*
         *@params String xmlMsg 格式化后的 xml 字符串
         *@return String 加密后的字符串 填入到 Encrypt 节点中
         * 参照官方文档 需要返回一个buf: 随机16字节 + xmlMsg.length(4字节）+xmlMsg+appid。
         * buf的字节长度需要填充到 32的整数，填充长度为 32-buf.length%32, 每一个字节为 32-buf.length%32
         */

        const random16 = crypto.pseudoRandomBytes(16);
        const msg = Buffer.from(xmlMsg);
        const msgLength = Buffer.alloc(4);
        msgLength.writeUInt32BE(msg.length, 0);

        const corpId = Buffer.from(this.appid);

        let rawMsg = Buffer.concat([random16, msgLength, msg, corpId]);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.aesKey, this.IV);
        cipher.setAutoPadding(false); // 重要，autopadding填充的内容无法正常解密
        rawMsg = this.PKCS7Encode(rawMsg);

        const cipheredMsg = Buffer.concat([cipher.update(rawMsg), cipher.final()]);

        return cipheredMsg.toString('base64');
    }
    decrypt(text: string) {
        /*
         *@params String text 需要解密的字段（Encrypt节点中的内容）
         * @return String msg_content 返回消息内容（xml字符串）
         */
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.aesKey, this.IV);
        decipher.setAutoPadding(false);

        let decipheredBuff = Buffer.concat([decipher.update(text, 'base64'), decipher.final()]);
        decipheredBuff = this.PKCS7Decode(decipheredBuff);

        const lenNetOrderCorpid = decipheredBuff.slice(16);
        // 切割掉16个随机字符，剩余为 (4字节的 msg_len) + msg_content(长度为 msg_len ) + msg_appId

        const msgLen = lenNetOrderCorpid.slice(0, 4).readUInt32BE(0);
        const msgContent = lenNetOrderCorpid.slice(4, msgLen + 4).toString('utf-8');
        //  let msg_appId =len_netOrder_corpid.slice(msg_len+4).toString('utf-8')

        return msgContent;
    }
    PKCS7Decode(buff: any) {
        /*
         *去除尾部自动填充的内容
         */
        let padContent = buff[buff.length - 1];
        if (padContent < 1 || padContent > 32) {
            padContent = 0;
        }
        // 根据填充规则，填充长度 = 填充内容，这一步赋值可以省略
        const padLen = padContent;
        return buff.slice(0, buff.length - padLen);
    }
    PKCS7Encode(buff: any) {
        const blockSize = 32;
        let needPadLen = 32 - buff.length % 32;
        if (needPadLen === 0) {
            needPadLen = blockSize;
        }
        const pad = Buffer.alloc(needPadLen);
        pad.fill(needPadLen);
        const newBuff = Buffer.concat([buff, pad]);
        return newBuff;
    }

    encryptMsg(replyMsg: any, opts = {} as any) {
        const result = {} as any;
        const options = opts || {};
        result.Encrypt = this.encrypt(replyMsg);
        result.Nonce = options.nonce || parseInt((Math.random() * 100000000000).toString(), 10);
        result.TimeStamp = options.timestamp || new Date().getTime();
        result.MsgSignature = this.getSignature(result.TimeStamp, result.Nonce, result.Encrypt);
        const buildXML = new XMLParser.Builder(
            {
                rootName: 'xml',
                cdata: true,
                headless: true,
                renderOpts: { indent: ' ', pretty: true },
            },
        );
        return buildXML.buildObject(result);
    }

    getSignature(timestamp: any, nonce: any, encrypt: any) {
        const rawSignature = [this.token, timestamp, nonce, encrypt].sort().join('');
        const sha1 = crypto.createHash('sha1');
        sha1.update(rawSignature);
        return sha1.digest('hex');
    };
};
