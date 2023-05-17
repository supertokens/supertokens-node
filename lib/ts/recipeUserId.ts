export default class RecipeUserId {
    private recipeUserId: string;
    constructor(recipeUserId: string) {
        this.recipeUserId = recipeUserId;
    }

    public getAsString = () => {
        return this.recipeUserId;
    };
}
