export class UpsConfig {
    constructor(
        public url: string = '',
        public login: string = '',
        public projectId: string = '',
        public password: string = '',
        public reviewers: string[] = []
    ) {}
};