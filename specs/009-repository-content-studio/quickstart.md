# Validation quickstart

1. Use Node 22+, run npm ci, npm test and npm run build. Existing public routes remain readable with npm start on 127.0.0.1:4173.
2. Run npm run author. Open the exact printed 127.0.0.1:4174 address. No public hosting or network binding is needed.
3. Select a catalog, create an item and weapon, add typed sourced statistics, create a recipe using searchable references, and add original fixture art with explicit distribution rights.
4. Crop using numeric controls, generate a thumbnail, attach primary/additional pictures, inspect preview and Save to repository. Confirm paths and the managed change summary.
5. Restart authoring and verify source persists. Build and open the normal reader without importing browser data. A clean checkout containing the saved files must show the same records and images.
6. Test another tab/external change conflict, cancel, invalid reference, unsupported image, in-use deletion and simulated interrupted-save recovery. Previous valid files must survive; recovery conflicts must not be overwritten.
7. Run all runtime/repository checks and hosted Chrome Windows/Linux plus Firefox/WebKit behavior and Chrome/Firefox visual evidence. The public distributable must contain no author server endpoint or private data.

These are target validation instructions, not claims of completed tests. Exact results and limitations belong in acceptance.md.
