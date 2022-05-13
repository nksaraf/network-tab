import { Component, createMemo, JSX } from "solid-js";
import { render } from "solid-js/web";
import { createControls } from "solid-leva";
import "twind/shim";

const App: Component = () => {
  const controls = createControls({
    rendering: {
      options: ["server", "client"],
      value: "client"
    },
    // streaming: false,
    prefetchRouteData: false,
    nestedRouting: true,
    networkDelay: {
      value: 5,
      step: 1
    },
    bandwith: {
      value: 5,
      label: "bandwidth (b/s)",
      step: 1
    },
    apiFromServer: {
      value: 15,
      step: 1
    },
    apiFromClient: {
      value: 15,
      step: 1
    }
  });

  const requests = createMemo(() => {
    let requestList = [
      // [["document", 40]],
      // [["root.js", 10]],
      // [
      //   ["user.json", controls.apiFromServer],
      //   ["sales.js", 10]
      // ],
      // [
      //   ["sales/nav.json", controls.apiFromServer],
      //   ["invoices.js", 10]
      // ],
      // [
      //   ["invoice.js", 10],
      //   ["invoice/{id}.json", controls.apiFromServer]
      // ]
    ];

    let apis = [
      [
        "user.json",
        controls.rendering === "server"
          ? controls.apiFromServer
          : controls.apiFromClient
      ],
      [
        "sales/nav.json",
        controls.rendering === "server"
          ? controls.apiFromServer
          : controls.apiFromClient
      ],
      [
        "invoice/{id}.json",
        controls.rendering === "server"
          ? controls.apiFromServer
          : controls.apiFromClient
      ]
    ];

    let routeSize = 50;
    let rootSize = 200;

    let routes = [
      [
        "sales.js",
        controls.networkDelay + (routeSize + 50) / controls.bandwith
      ],
      ["invoices.js", controls.networkDelay + routeSize / controls.bandwith],
      [
        "invoice.js",
        controls.networkDelay + (routeSize + 10) / controls.bandwith
      ]
    ];

    let path = controls.prefetchRouteData
      ? [[apis[0], routes[0], apis[1]], [routes[1]], [routes[2], apis[2]]]
      : [[apis[0], routes[0]], [apis[1], routes[1]], [routes[2]], [apis[2]]];

    let sum = (...v) => {
      let s = 0;
      for (var i = 0; i < v.length; i++) {
        s += v[i];
      }
      return s;
    };

    if (controls.rendering === "server") {
      let apiDelay = controls.nestedRouting
        ? Math.max(...apis.map((a) => a[1]))
        : sum(...apis.map((a) => a[1]));
      let docSize = 100;
      let documentDelay =
        controls.networkDelay +
        apiDelay +
        docSize / controls.bandwith +
        controls.networkDelay;

      if (controls.nestedRouting) {
        requestList.push([
          ["document", documentDelay],
          ...apis.map((a) => [a[0], a[1], controls.networkDelay])
        ]);
        requestList.push([
          ["root.js", rootSize / controls.bandwith],
          ...routes
        ]);
      } else {
        let api = [];
        apis.forEach((a, index) => {
          if (index > 0) {
            api.push([a[0], a[1], api[index - 1][2] + api[index - 1][1]]);
          } else {
            api.push([a[0], a[1], controls.networkDelay]);
          }
        });
        // let route = [];
        // routes.forEach((a, index) => {
        //   if (index > 0) {
        //     route.push([
        //       a[0],
        //       a[1],
        //       routes[index - 1][2] + route[index - 1][1]
        //     ]);
        //   } else {
        //     route.push(a);
        //   }
        // });
        requestList.push([["document", documentDelay], ...api]);
        requestList.push([["root.js", rootSize / controls.bandwith]]);
        routes.forEach((r) => {
          requestList.push([r]);
        });
      }
    } else {
      // let apiDelay = controls.nestedRouting
      //   ? Math.max(...apis.map((a) => a[1]))
      //   : sum(...apis.map((a) => a[1]));
      let docSize = 20;
      let documentDelay =
        controls.networkDelay +
        // apiDelay +
        docSize / controls.bandwith +
        controls.networkDelay;

      if (controls.nestedRouting) {
        requestList.push([["document", documentDelay]]);
        requestList.push([["root.js", rootSize / controls.bandwith]]);
        if (controls.prefetchRouteData) {
          requestList.push([...apis.map((a) => [a[0], a[1]]), ...routes]);
        } else {
          requestList.push([
            apis[0],
            routes[0],
            [...apis[1], routes[0][1]],
            routes[1],
            routes[2],
            [...apis[2], routes[2][1]]
          ]);
        }
      } else {
        // let api = [];
        // apis.forEach((a, index) => {
        //   if (index > 0) {
        //     api.push([a[0], a[1], controls.networkDelay + api[index - 1][1]]);
        //   } else {
        //     api.push([a[0], a[1], controls.networkDelay]);
        //   }
        // });
        requestList.push([["document", documentDelay]]);
        requestList.push([["root.js", rootSize / controls.bandwith]]);
        path.forEach((r) => {
          requestList.push(r);
        });
      }
    }

    let reqs = [];
    let delay = 0;

    requestList.forEach((req, i) => {
      let max = 0;
      req.forEach(([path, time, d], index) => {
        reqs.push({ path, delay: delay + (d ?? 0), time });
        if (time > max) {
          max = time;
        }
      });
      delay += max;
      max = 0;
    });
    return reqs;
  });

  console.log(requests());
  return (
    <>
      <h1 class="text-xl font-bold">Peek the Network tab</h1>
      <h2>Test different rendering methods</h2>

      <div
        style={{
          "margin-top": "240px",
          display: "flex",
          "flex-direction": "column"
        }}
      >
        <For each={requests()}>{(props) => <RequestTimeline {...props} />}</For>
      </div>
    </>
  );
};

function RequestTimeline(props) {
  return (
    <div
      class={`px-2 py-1 rounded-md ${
        props.server ? "bg-blue-600" : "bg-green-600"
      } text-white text-xs`}
      style={{
        "margin-left": `${props.delay * 7.5}px`,
        width: `${props.time * 7.5}px`,
        "margin-top": "4px"
      }}
    >
      {props.path}
    </div>
  );
}

render(() => <App />, document.getElementById("app"));
