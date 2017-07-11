import { ReviewIdDTO } from './ReviewIdDTO';
import { RevisionInfoDTO } from './RevisionInfoDTO';

export class BranchDTO {
    constructor(
        public projectId: string,
        public name: string,
        public lastRevision: RevisionInfoDTO,
        public isDefault: boolean,
        // public stats: BranchStatsDTO,
        public isHosted: boolean,
        public reviewId: ReviewIdDTO,
    ) {}
};