"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RecipeUserId {
    constructor(recipeUserId) {
        this.getAsString = () => {
            return this.recipeUserId;
        };
        if (recipeUserId === undefined) {
            throw new Error("recipeUserId cannot be undefined. Please check for bugs in code");
        }
        this.recipeUserId = recipeUserId;
    }
}
exports.default = RecipeUserId;
