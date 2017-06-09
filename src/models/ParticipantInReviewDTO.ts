export class ParticipantInReviewDTO {
    constructor(
        public userId: string,
        public role: number,
        public state: number,
    ) {}
};