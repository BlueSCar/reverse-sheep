module.exports = (promise, pgp) => {
    const user = process.env.DB_USER;
    const password = process.env.DB_PASSWORD;
    const port = process.env.DB_PORT;
    const name = process.env.DB_NAME;

    const connectionString = `postgres://${user}:${password}@localhost:${port}/${name}`;
    const dbCreator = pgp({
        promiseLib: promise
    });

    return dbCreator(connectionString);
}