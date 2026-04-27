"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MusicManagerModule = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("@nestjs/axios");
const music_manager_controller_1 = require("./infrastructure/rest/music-manager.controller");
const music_manager_service_1 = require("./application/music-manager.service");
const music_resolver_1 = require("./infrastructure/graphql/music.resolver");
const prisma_service_1 = require("../../prisma.service");
let MusicManagerModule = class MusicManagerModule {
};
exports.MusicManagerModule = MusicManagerModule;
exports.MusicManagerModule = MusicManagerModule = __decorate([
    (0, common_1.Module)({
        imports: [axios_1.HttpModule],
        controllers: [music_manager_controller_1.MusicManagerController],
        providers: [music_manager_service_1.MusicManagerService, prisma_service_1.PrismaService, music_resolver_1.MusicManagerResolver],
    })
], MusicManagerModule);
//# sourceMappingURL=music-manager.module.js.map