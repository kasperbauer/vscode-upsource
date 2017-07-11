import { RevisionInfoDTO } from './RevisionInfoDTO';

export class RevisionDescriptorListDTO {
    constructor(
        public revision: RevisionInfoDTO[],
        // public graph?: RevisionListGraphDTO,
        public headHash?: string,
        public query?: string,
    ) {}
};