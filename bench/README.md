# Measuring the chunked map

One big connected road network: a single component in the sense of graph theory (rows of straight roads 40 m apart, every row joined to the next by S-curves; `src/lib/testing/benchMap.test.ts` checks it), imported into
the app like a file, in a real Chromium on the production build. It measures: the import, the build
of the index, opening the project, the first view, panning while chunks are read, and panning,
zooming and rotating inside what is loaded. The frame rate limit of the browser is lifted, so the
frame times say how fast it can go on this machine.

## Run it on your machine

Once: `bun install` and `bunx playwright install chromium`. Then, with a screen (the window opens
and the GPU is used):

```bash
SIZES=300000,800000,2000000 bun run bench
```

Leave the window alone while it runs (it moves the camera itself). It takes a while: roughly 6
minutes for 300,000 nodes, and an hour or more for 2,000,000 (the import and the build of the index
are what take the time). The disk needs about 1.6 KB per node while it runs; the data is deleted
at the end. After each size the report so far is written to `bench/out/report-<date>.md`
(and `.json`). **Send me that `.md` file.**

- `SIZES=100000` to try it with a small map first.
- `HEADLESS=1` runs without a window (software drawing: the numbers are about the machine's CPU,
  not its GPU).
- `PAN_SECONDS`, `ESTABLISHED_SECONDS`, `SPACING` change the length of the parts and the distance
  of the nodes.
