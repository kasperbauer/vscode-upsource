export class UsersOthersDTO {
    constructor(
        public others: string[],
        public hasMore: boolean
    ) {}
};