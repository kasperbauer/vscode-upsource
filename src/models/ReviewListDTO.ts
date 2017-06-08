import { ReviewDescriptorDTO } from './ReviewDescriptorDTO';

export class ReviewListDTO {
    constructor(
        public reviews: ReviewDescriptorDTO[],
        public hasMore: boolean,
        public totalCount: number,
    ) {}
};