// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportWxopen from '../../../app/controller/wxopen';

declare module 'egg' {
  interface IController {
    wxopen: ExportWxopen;
  }
}
