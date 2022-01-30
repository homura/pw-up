# pw-up

This tools helps you transfer your sUDT from [pw-lock](https://docs.nervos.org/docs/essays/pw-lock)
to [omni-lock](https://github.com/XuJiandong/docs-bank/blob/master/omni_lock.md).

## Quick Start

```
git clone https://github.com/homura/pw-up.git
yarn
yarn start
```

## FAQ

### Why I need this tool?

I want to use [yokaiswap](https://www.yokaiswap.com/), but the current yokaiswap support is omni-lock, so I need to
transfer my assets to omni-lock first

### Is there a version for online deployment, I don't want to compile it myself

We do offer an [online version](https://pw-up.vercel.app/), but whether it is online or not, you use this tool AT YOUR
OWN RISK!

### Why the tool asks me additional CKB to transfer to Omni lock?

Because Omni lock requires more CKB than PW lock, but please don't worry, this part of CKB is only temporarily occupied,
and each asset (cell) will only occupy 2 additional CKB.
