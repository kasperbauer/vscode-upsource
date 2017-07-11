import { RoleInReviewEnum, ParticipantStateEnum } from './Enums';

export class ParticipantInReviewDTO {
    constructor(
        public userId: string,
        public role: RoleInReviewEnum,
        public state: ParticipantStateEnum,
    ) {}
};