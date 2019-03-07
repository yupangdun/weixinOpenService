// const messageConfigs = [{
//   MsgType: 'news',
//   ArticleCount: 1,
//   Title: '歌志轩',
//   Description: '歌志轩测试图文消息',
//   PicUrl: 'http://pic.chinasspp.com/Brand/u/723243/image/201705/26153627_3281.jpg',
//   Url: 'http://oss.imprexion.cn/h5/lottery/luckyCodeDetail.html',
// }];

export enum EventKey {
  GEZHIXUANF = 'imprexion_f',
  GEZHIXUANM = 'imprexion_m',
}
export const messageConfigs = [{
  MsgType: 'news',
  ArticleCount: 1,
  Title: '指定面款半价券',
  Description: '小姐姐，快去歌志轩吃面吧~',
  PicUrl: 'http://oss.imprexion.cn/h5/lottery/gezhixuan_icon.jpg',
  // tslint:disable-next-line:max-line-length
  Url: 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx6aef1915818229a5&redirect_uri=http://oss.imprexion.cn/h5/lottery/gezhixuan.html&response_type=code&scope=snsapi_base&state=f#wechat_redirect',
},
{
  MsgType: 'news',
  ArticleCount: 1,
  Title: '5元现金券',
  Description: '小哥哥，快去歌志轩吃面吧~',
  PicUrl: 'http://oss.imprexion.cn/h5/lottery/gezhixuan_icon.jpg',
  // tslint:disable-next-line:max-line-length
  Url: 'https://open.weixin.qq.com/connect/oauth2/authorize?appid=wx6aef1915818229a5&redirect_uri=http://oss.imprexion.cn/h5/lottery/gezhixuan.html&response_type=code&scope=snsapi_base&state=m#wechat_redirect',
}];
