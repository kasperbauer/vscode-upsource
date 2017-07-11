import { BranchDTO } from './BranchDTO';

export class BranchListDTO {
    constructor(
        public branch: BranchDTO[],
        public hasMore: boolean,
        public totalBranches: number,
        public defaultBranch?: string,
        public isDefaultBranchExists?: boolean,
    ) {}
};