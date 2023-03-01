const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const db = require("@saltcorn/data/db");
const Workflow = require("@saltcorn/data/models/workflow");

const { div, script, domReady } = require("@saltcorn/markup/tags");
const {
  stateFieldsToWhere,
  readState,
} = require("@saltcorn/data/plugin-helper");

const get_state_fields = async (table_id, viewname, { show_view }) => {
  const table_fields = await Field.find({ table_id });
  return table_fields.map((f) => {
    const sf = new Field(f);
    sf.required = false;
    return sf;
  });
};
const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "views",
        form: async (context) => {
          const table = await Table.findOne({ id: context.table_id });
          return new Form({
            fields: [
              {
                name: "y_field",
                label: "Y axis field",
                type: "String",
                required: true,
                attributes: {
                  options: table.fields
                    .filter((f) => f.type?.name === "FloatArray")
                    .map((f) => f.name),
                },
              },
              {
                name: "x_field",
                label: "X axis field",
                type: "String",
                attributes: {
                  options: [
                    ...table.fields
                      .filter((f) => f.type?.name === "FloatArray")
                      .map((f) => f.name),
                  ],
                },
              },
              {
                name: "style",
                label: "Style",
                type: "String",
                required: true,
                attributes: {
                  options: ["lines", "markers", "lines+markers"],
                },
              },
              {
                name: "title",
                label: "Plot title",
                type: "String",
                required: false,
              },
              {
                name: "height",
                label: "Height",
                type: "Integer",
                required: true,
                default: 450,
              },
            ],
          });
        },
      },
    ],
  });
const plotly = (id, ...args) =>
  `Plotly.newPlot(document.getElementById("${id}"),${args
    .map(JSON.stringify)
    .join()});`;
const run = async (
  table_id,
  viewname,
  { y_field, x_field, style, title, height },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  readState(state, fields);
  const divid = `plot${Math.round(100000 * Math.random())}`;
  const xfld = x_field && fields.find((f) => f.name === x_field);
  const yfld = fields.find((f) => f.name === y_field);
  const where = await stateFieldsToWhere({ fields, state });
  const row = await table.getRow(where, { orderBy: x_field });
  if (!row) return "No row selected";
  const y = row[yfld.name];
  if (!y) return "";
  const x = xfld ? row[xfld.name] : y.map((yv, i) => i);
  const data = [
    {
      type: "scatter",
      mode: "lines",
      x,
      y,
    },
  ];
  var config = {
    displayModeBar: false,
    responsive: true,
  };
  var layout = {
    title,
    showlegend: false,
    height: +height,
    margin: title ? { pad: 4, t: 40, r: 25 } : { pad: 4, t: 10, r: 25 },
    xaxis: { title: xfld ? xfld.label : "index", automargin: true },
    yaxis: { title: yfld.label, automargin: true },
  };
  return (
    div({ id: divid }) +
    script(
      domReady(
        plotly(divid, data, layout, config) +
          `setTimeout(()=>Plotly.Plots.resize('${divid}'), 250);
        setTimeout(()=>Plotly.Plots.resize('${divid}'), 500);
        setTimeout(()=>Plotly.Plots.resize('${divid}'), 750);
        setInterval(()=>Plotly.Plots.resize('${divid}'), 1000);`
      )
    )
  );
};

module.exports = {
  name: "ArrayVis",
  display_state_form: false,
  description:
    "Visualise the relationship between two fields as a line or scatter plot",
  get_state_fields,
  configuration_workflow,
  run,
};
