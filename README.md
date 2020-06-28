# ts-transform-esm-module-specifier

### NOTE: This transformer is entirely experimental. Use it at your own risk.
#### I highly recommend making a backup of any work before testing this. It shouldn't destroy anything, but I can't promise that. So don't hold me liable if your project get mangled or your computer explodes :)

Transforms typescript import statements into a format currently accepted by node.js ES Module system.

For example:

```javascript
import { thing } from "folder/file"
``` 
becomes 

```javascript
import { thing } from "folder/file.js"
```

and

```javascript
import { thing } from "folder/anotherFolder"
```

becomes

```javascript
import { thing } from "folder/anotherFolder/index.js"
```
