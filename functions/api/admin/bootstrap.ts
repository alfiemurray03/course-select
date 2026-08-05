const retiredBootstrap: PagesFunction = async () => Response.json({
  error: 'catalogue_bootstrap_retired',
  message: 'Sousa Murray eLearning course content, categories, learning outcomes and standard prices are now deployed from the codebase. This endpoint no longer writes the catalogue into D1.',
}, {
  status: 410,
  headers: {
    'Cache-Control': 'no-store',
    'X-Sousa Murray eLearning-Catalogue-Source': 'code',
  },
});

export const onRequestPost = retiredBootstrap;
export const onRequest = retiredBootstrap;
