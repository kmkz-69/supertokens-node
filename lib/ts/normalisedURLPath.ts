/* Copyright (c) 2021, VRAI Labs and/or its affiliates. All rights reserved.
 *
 * This software is licensed under the Apache License, Version 2.0 (the
 * "License") as published by the Apache Software Foundation.
 *
 * You may not use this file except in compliance with the License. You may
 * obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations
 * under the License.
 */

import { URL } from "url";
import SuperTokensError from "./error";
import STError from "./error";
import RecipeModule from "./recipeModule";

export default class NormalisedURLPath {
    private value: string;

    constructor(recipe: RecipeModule | undefined, url: string) {
        this.value = normaliseURLPathOrThrowError(recipe, url);
    }

    startsWith = (other: NormalisedURLPath) => {
        return this.value.startsWith(other.value);
    };

    appendPath = (recipe: RecipeModule | undefined, other: NormalisedURLPath) => {
        return new NormalisedURLPath(recipe, this.value + other.value);
    };

    getAsStringDangerous = () => {
        return this.value;
    };

    equals = (other: NormalisedURLPath) => {
        return this.value === other.value;
    };

    isARecipePath = () => {
        return this.value === "/recipe" || this.value.startsWith("/recipe/");
    };
}

export function normaliseURLPathOrThrowError(recipe: RecipeModule | undefined, input: string): string {
    input = input.trim().toLowerCase();

    try {
        if (!input.startsWith("http://") && !input.startsWith("https://")) {
            throw new Error("converting to proper URL");
        }
        let urlObj = new URL(input);
        input = urlObj.pathname;

        if (input.charAt(input.length - 1) === "/") {
            return input.substr(0, input.length - 1);
        }

        return input;
    } catch (err) {}
    // not a valid URL

    // If the input contains a . it means they have given a domain name.
    // So we try assuming that they have given a domain name + path
    if (
        (domainGiven(input) || input.startsWith("localhost")) &&
        !input.startsWith("http://") &&
        !input.startsWith("https://")
    ) {
        input = "http://" + input;
        return normaliseURLPathOrThrowError(recipe, input);
    }

    if (input.charAt(0) !== "/") {
        input = "/" + input;
    }

    // at this point, we should be able to convert it into a fake URL and recursively call this function.
    try {
        // test that we can convert this to prevent an infinite loop
        new URL("http://example.com" + input);

        return normaliseURLPathOrThrowError(recipe, "http://example.com" + input);
    } catch (err) {
        throw new STError({
            type: STError.GENERAL_ERROR,
            recipe,
            payload: new Error("Please provide a valid URL path"),
        });
    }
}

function domainGiven(input: string): boolean {
    // If no dot, return false.
    if (input.indexOf(".") === -1) {
        return false;
    }

    try {
        let url = new URL(input);
        return url.hostname.indexOf(".") !== -1;
    } catch (ignored) {}

    try {
        let url = new URL("http://" + input);
        return url.hostname.indexOf(".") !== -1;
    } catch (ignored) {}

    return false;
}
