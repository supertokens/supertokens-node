"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RecipeUserId {
    constructor(recipeUserId) {
        this.getAsString = () => {
            return this.recipeUserId;
        };
        this.recipeUserId = recipeUserId;
    }
}
exports.default = RecipeUserId;
