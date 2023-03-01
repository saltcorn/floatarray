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
                name: "value_array_field",
                label: "Value array field",
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
                required: true,
                attributes: {
                  options: [
                    ...table.fields
                      .filter((f) =>
                        ["Date", "Integer", "Float"].includes(f.type?.name)
                      )
                      .map((f) => f.name),
                  ],
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
//https://stackoverflow.com/a/46805290
function transpose(matrix) {
  const rows = matrix.length,
    cols = matrix[0].length;
  const grid = [];
  for (let j = 0; j < cols; j++) {
    grid[j] = Array(rows);
  }
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      grid[j][i] = matrix[i][j];
    }
  }
  return grid;
}
const run = async (
  table_id,
  viewname,
  { value_array_field, x_field, style, title, height },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields();
  readState(state, fields);
  const divid = `plot${Math.round(100000 * Math.random())}`;
  const xfld = x_field && fields.find((f) => f.name === x_field);
  const yfld = fields.find((f) => f.name === value_array_field);
  const where = await stateFieldsToWhere({ fields, state });
  const rows0 = await table.getRows(where, { orderBy: x_field });
  const rows = rows0.filter((row) => row[yfld.name]);
  if (rows.length === 0) return "No data";
  const z = transpose(rows.map((row) => row[yfld.name]));
  const x = rows.map((row) => row[xfld.name]);
  const data = [
    {
      type: "heatmap",
      x,
      z,
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
  name: "Spectrogram",
  display_state_form: false,
  get_state_fields,
  configuration_workflow,
  run,
};
