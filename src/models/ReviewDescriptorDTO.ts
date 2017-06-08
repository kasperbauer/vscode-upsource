import { ReviewIdDTO } from './ReviewIdDTO';

export class ReviewDescriptorDTO {
    constructor(
        public reviewId: ReviewIdDTO,
        public title: string,
        // public participants: ParticipantInReviewDTO,
        public state: number, // 1 = open, 2 = closed
        public branch: string[],
        // public issue: IssueIdDTO[],
        public updatedAt: number,
        public isUnread?: boolean,
        public isReadToClose?: boolean,
        public isRemoved?: boolean,
        // public completionRate?: CompletionRateDTO,
        // public discussionCounter?: SimpleDiscussionCounterDTO
    ) {}
};