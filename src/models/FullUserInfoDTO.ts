export class FullUserInfoDTO {
    constructor(
        public userId: string,
        public name: string,
        public isResolved: boolean,
        public isMe: boolean,
        public avatarUrl?: string,
        public profileUrl?: string,
        public email?: string,
        public login?: string,
    ) {}
};