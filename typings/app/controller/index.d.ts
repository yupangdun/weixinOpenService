// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportWxOpen from '../../../app/controller/wxOpen';

declare module 'egg' {
  interface IController {
    wxOpen: ExportWxOpen;
  }
}
