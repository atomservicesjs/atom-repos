import { IEventStores } from "atomservicescore";
import { Collection } from "mongodb";
import { createEventCursor } from "./core/createEventCursor";
import { IEventStoresConnect } from "./IEventStoresConnect";

export const createEventStores = (EventStoresConnect: IEventStoresConnect | { connect: (scope: string, type: string) => Promise<Collection>; }): IEventStores =>
  ((EventStores): IEventStores => {
    const Stores: IEventStores = {
      countAggregateIDs: async (scope, type, options) => {
        return 0;
      },
      countEvents: async (scope, type, options) => {
        return 0;
      },
      fetchAggregateIDs: async (scope, type, options) => {
        const collection = await EventStores.connect(scope, type);
        const cursor = collection.find();

        return createEventCursor.fromFind(cursor);
      },
      fetchEvents: async (scope, type, options) => {
        const collection = await EventStores.connect(scope, type);
        const cursor = collection.find();

        return createEventCursor.fromFind(cursor);
      },
      queryByEventID: async (scope, type, eventID) => {
        const collection = await EventStores.connect(scope, type);
        const event = await collection.findOne({ _id: eventID });

        return event;
      },
      queryCurrentVersion: async (scope, type, aggregateID) => {
        const collection = await EventStores.connect(scope, type);
        const list = await collection.aggregate([
          { $match: { aggregateID } },
          { $sort: { _version: -1 } },
          { $limit: 1 },
        ]).toArray();

        if (list.length > 0) {
          const item = list[0];
          return {
            aggregateID,
            type,
            version: item._version,
          };
        } else {
          return {
            aggregateID,
            type,
            version: 0,
          };
        }
      },
      queryEventsByAggregateID: async (scope, type, aggregateID, options) => {
        const collection = await EventStores.connect(scope, type);

        if (options) {
          const { initialVersion, limit } = options;
          const aggregate: any[] = [];

          const $match: {
            _version?: { $gte: number };
            aggregateID: string;
          } = { aggregateID };

          if (initialVersion) {
            $match._version = { $gte: initialVersion };
          }

          const $sort = { _version: 1 };

          aggregate.push({ $match });
          aggregate.push({ $sort });

          if (limit) {
            const $limit = limit;
            aggregate.push({ $limit });
          }

          const cursor = collection.aggregate(aggregate);

          return createEventCursor.fromAggregation(cursor);
        } else {
          const cursor = collection.find({ aggregateID });

          return createEventCursor.fromFind(cursor);
        }
      },
      storeEvent: async (scope, event) => {
        const collection = await EventStores.connect(scope, event.type);

        await collection.insertOne(event);
      },
      storeEvents: async (scope, events) => {
        const reducedEvents = events.reduce((result, each) => {
          if (!result[each.type]) {
            result[each.type] = [];
          }

          result[each.type].push(each);

          return result;
        }, {} as { [type: string]: any[]; });

        const types = Object.keys(reducedEvents);
        const ps = types.map(async (type) => {
          const collection = await EventStores.connect(scope, type);

          return collection.insertMany(reducedEvents[type]);
        });

        await Promise.all(ps);
      },
    };

    Object.freeze(Stores);

    return Stores;
  })(EventStoresConnect);
