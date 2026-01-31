## API endpoints

**/stops?q=**

```ts
{
    results: {
        name: string;
        ids: string[];
        url: string;
    }[];
    cache?: boolean | undefined;
}
```

**/stops/:ids?shortnamefilter=&tripheadsignfilter=**

```ts
{
    results: {
        stopTimeCached: boolean;
        stopTime: {
            arrivalTime: string;
            departureTime: string;
            stopId: string;
            stopHeadsign: string;
            routeId: string;
            routeShortName: string;
            routeLongName: string;
            tripId: string;
            tripHeadSign: string;
        };
        tripUpdate?: {
            delay: number;
            cancelled: boolean;
            calculatedArrivalTime: string;
            minutesUntill: number;
        } | undefined;
    }[];
}
```
