# backend

## Requirements
- Install ```sqlite3```
[Homepage](https://www.sqlite.org/)

- Create ```database.db``` in root directory using
```bash
sqlite3 database.db
```
- **TEST** schema:
```sql
CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL);
INSERT INTO users (name) VALUES ("hello world");
INSERT INTO users (name) VALUES ("hello world 2");
```

## Develop
- install: ```npm install```
- debug: ```npm run debug```
- start: ```npm start```

### Testing path
- ```/```:
```json
{ "message": "KiMS API" }
```
- ```/users```:
```json
[{"id":1,"name":"hello world"},{"id":2,"name":"hello world 2"}]
```