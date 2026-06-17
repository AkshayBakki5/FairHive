# FairHive Data Schema (JSON Storage)

All data is stored in `backend/data/*.json`. Each file is a JSON array of documents with an `id` field. Dates are stored as ISO strings.

## Users

| Field         | Type     | Description                    |
|---------------|----------|--------------------------------|
| email         | string   | Unique, normalized lowercase   |
| passwordHash   | string   | bcrypt hash                    |
| displayName   | string   | Display name                   |
| role          | string   | `admin` \| `member` (app-level)|
| createdAt     | Timestamp|                                |

## Rooms

| Field    | Type     | Description              |
|----------|----------|--------------------------|
| name     | string   | Room name                |
| code     | string   | 6-char join code (unique)|
| createdBy| string   | userId                    |
| createdAt| Timestamp|                          |

## RoomMembers

| Field   | Type     | Description           |
|---------|----------|-----------------------|
| roomId  | string   | Reference to Rooms    |
| userId  | string   | Reference to Users    |
| role    | string   | `admin` \| `member`   |
| joinedAt| Timestamp|                       |

**Composite:** (roomId, userId) should be unique for join logic.

## Expenses

| Field        | Type     | Description                    |
|--------------|----------|--------------------------------|
| roomId       | string   |                                |
| addedBy      | string   | userId                         |
| amount       | number   | Total amount                   |
| description  | string   |                                |
| splitType    | string   | `equal` \| `custom`            |
| billImageUrl | string?  | Optional proof image URL       |
| createdAt    | Timestamp|                                |

## ExpenseSplits

| Field     | Type     | Description     |
|-----------|----------|-----------------|
| expenseId | string   | Reference       |
| userId    | string   | Member share    |
| amount    | number   | Share amount    |
| paid      | boolean  |                 |
| paidAt    | Timestamp?| When marked paid|

## Chores

| Field         | Type     | Description                          |
|---------------|----------|--------------------------------------|
| roomId        | string   |                                      |
| title         | string   |                                      |
| description   | string   |                                      |
| rotationOrder | array    | [userId, ...] rotation sequence      |
| frequency     | string   | `once` \| `daily` \| `weekly` \| `monthly` |
| priority      | string   | `low` \| `medium` \| `high` (default medium) |
| createdAt     | Timestamp|                                      |

## ChoreAssignments

| Field       | Type     | Description     |
|-------------|----------|-----------------|
| choreId     | string   |                 |
| userId      | string   | Assigned to     |
| dueDate     | Timestamp|                 |
| completed   | boolean  |                 |
| completedAt | Timestamp?|                 |

## Bills

| Field        | Type     | Description     |
|--------------|----------|-----------------|
| roomId       | string   |                 |
| name         | string   |                 |
| amount       | number   |                 |
| dueDate      | Timestamp|                 |
| billImageUrl | string?  |                 |
| paid         | boolean  |                 |
| paidBy       | string?  | userId          |
| paidAt       | Timestamp?|                 |
| createdAt    | Timestamp|                 |

## Payments (optional)

| Field     | Type     | Description        |
|-----------|----------|--------------------|
| billId    | string?  | Or expenseId       |
| fromUserId| string   |                    |
| toUserId  | string?  | Or roomId          |
| amount    | number   |                    |
| createdAt | Timestamp|                    |
