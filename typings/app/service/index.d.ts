// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportAes from '../../../app/service/aes';
import ExportWxopen from '../../../app/service/wxopen';

declare module 'egg' {
  interface IService {
    aes: ExportAes;
    wxopen: ExportWxopen;
  }
}
