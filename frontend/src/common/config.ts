export default class Config {
    public static get backend(): string {
        return process.env.REACT_APP_BACKEND_SERVER!;
    }

    public static get sparql(): string {
        return process.env.REACT_APP_SPARQL_ENDPOINT!;
    }

    public static get googleClientId(): string {
        return process.env.REACT_APP_GOOGLE_CLIENT_ID!;
    }
}