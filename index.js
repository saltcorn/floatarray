const { div, pre, code, text, textarea } = require("@saltcorn/markup/tags");
const { features, getState } = require("@saltcorn/data/db/state");

const ppArray = (v) => {
  if (!v) return "";
  if (Array.isArray(v)) return v.map((vl) => vl.toString()).join(",");
  return "";
};

const floatArray = {
  name: "FloatArray",
  sql_name: "real[]",
  fieldviews: {
    show: {
      isEdit: false,
      run: (v) => pre({ class: "wsprewrap" }, code(ppArray(v))),
    },

    edit: {
      isEdit: true,
      run: (nm, v, attrs, cls) =>
        textarea(
          {
            class: ["form-control", cls],
            name: encodeURIComponent(nm),
            id: `input${encodeURIComponent(nm)}`,
            rows: 10,
          },
          typeof v === "undefined" ? "" : text(ppArray(v)) || ""
        ),
    },
  },
  attributes: [],
  read: (v, attrs) => {
    switch (typeof v) {
      case "string":
        return v ? v.split(",") : undefined;
      default:
        return v;
    }
  },
};

const array_stats = {
  run: (vs) => {
    if (!vs || vs.length === 0) return;
    let max = vs[0],
      min = vs[0],
      mini = 0,
      maxi = 0;
    for (let i = 1; i < vs.length; i++) {
      const v = vs[i];
      if (v > max) {
        max = v;
        maxi = i;
      } else if (v < min) {
        min = v;
        mini = i;
      }
    }
    return { max, min, mini, maxi };
  },
  isAsync: false,
  description: "Array min, max, maxi, mini",
  arguments: [{ name: "query", type: "Object" }],
};

module.exports = {
  sc_plugin_api_version: 1,
  types: [floatArray],
  plugin_name: "floatarray",
  functions: { array_stats },
  dependencies: ["@saltcorn/visualize"],
  viewtemplates: [require("./plot.js"), require("./spectrogram")],
};
