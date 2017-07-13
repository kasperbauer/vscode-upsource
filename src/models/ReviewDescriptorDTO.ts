import { ParticipantInReviewDTO } from './ParticipantInReviewDTO';
import { ReviewIdDTO } from './ReviewIdDTO';
import { ReviewStateEnum } from './Enums';
import { SimpleDiscussionCounterDTO } from './SimpleDiscussionCounterDTO';

export class ReviewDescriptorDTO {
    constructor(
        public reviewId: ReviewIdDTO,
        public title: string,
        public participants: ParticipantInReviewDTO[],
        public state: ReviewStateEnum,
        public branch: string[],
        // public issue: IssueIdDTO[],
        public updatedAt: number,
        public isUnread?: boolean,
        public isReadyToClose?: boolean,
        public isRemoved?: boolean,
        // public completionRate?: CompletionRateDTO,
        public discussionCounter?: SimpleDiscussionCounterDTO
    ) {}
};