import filter from "bad-words";

const badWordsFilter = new filter();

export function cleanString(word: string) {
    try {
        return badWordsFilter.clean(word);
    } catch {
        // on fail there is no word and therefore no bad word
        return word;
    }
}
