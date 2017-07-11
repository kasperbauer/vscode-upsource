export class RevisionInfoDTO {
    constructor(
        public projectId: string,
        public revisionId: string,
        public revisionDate: number,
        public revisionCommitMessage: string,
        // public state: RevisionStateEnum,
        public vcsRevisionId: string,
        public shortRevisionId: string,
        public authorId: string,
        // public reachability: RevisionReachabilityEnum,
        public tags: string[],
        public branchHeadLabel: string[],
    ) {}
};