export default class RecipeUserId {
    private recipeUserId: string;
    constructor(recipeUserId: string) {
        if (recipeUserId === undefined) {
            throw new Error("recipeUserId cannot be undefined. Please check for bugs in code");
        }
        this.recipeUserId = recipeUserId;
    }

    public getAsString = () => {
        return this.recipeUserId;
    };
}
