import { FullUserInfoDTO } from './FullUserInfoDTO';

export class UserInfoResponseDTO {
    constructor(
        public infos: FullUserInfoDTO[],
    ) {}
};