import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import "./driverTour.css";

export const CEMI_TOUR_SELECTORS = {
  workspaceHelpTrigger: '[data-tour="workspace-help-trigger"]',
  workspaceSearch: '[data-tour="workspace-search"]',
  workspaceProjectTable: '[data-tour="workspace-project-table"]',
  workspaceProjectRowFirst: '[data-tour="workspace-project-row-first"]',
  projectTabs: '[data-tour="project-tabs"]',
  tabRuns: '[data-tour="tab-runs"]',
  tabCompare: '[data-tour="tab-compare"]',
  tabConsole: '[data-tour="tab-console"]',
  runsTable: '[data-tour="runs-table"]',
  runCompareToggleFirst: '[data-tour="run-compare-toggle-first"]',
  runCompareToggleSecond: '[data-tour="run-compare-toggle-second"]',
  compareMainPanel: '[data-tour="compare-main-panel"]',
  compareSidebarPanel: '[data-tour="compare-sidebar-panel"]',
  consolePanel: '[data-tour="console-panel"]',
  consoleFeed: '[data-tour="console-feed"]',
} as const;

interface CemiTourControllerOptions {
  navigate: (path: string) => void;
  openProject: (projectId: string) => void;
  getProjects: () => Array<{ id: string; name: string }>;
  getRuns: () => Array<unknown>;
}

async function waitForSelector(selector: string, timeoutMs = 5000): Promise<Element | null> {
  const existing = document.querySelector(selector);
  if (existing) return existing;

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      const match = document.querySelector(selector);
      if (match) {
        observer.disconnect();
        window.clearTimeout(timeoutId);
        resolve(match);
      }
    });

    const timeoutId = window.setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeoutMs);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

async function navigateAndWait(path: string, selector: string, navigate: (path: string) => void): Promise<Element | null> {
  navigate(path);
  return waitForSelector(selector);
}

function ensureCompareSelected(selector: string) {
  const element = document.querySelector<HTMLElement>(selector);
  if (!element) return;
  if (element.getAttribute("data-selected") === "true") return;
  element.click();
}

function buildWorkspaceSteps(options: CemiTourControllerOptions): DriveStep[] {
  const projects = options.getProjects();
  const hasProjects = projects.length > 0;

  const steps: DriveStep[] = [
    {
      popover: {
        title: "Welcome to CEMI",
        description: "This walkthrough will guide you through the core CEMI workflow from workspace to runs, compare, and console.",
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.workspaceHelpTrigger,
      popover: {
        title: "Walkthrough Entry Point",
        description: "You can reopen this help bubble any time to restart the CEMI walkthrough.",
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.workspaceSearch,
      popover: {
        title: "Find a Project",
        description: "Search and filter your workspace to quickly find the project you want to inspect.",
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.workspaceProjectTable,
      popover: {
        title: "Projects Start Here",
        description: "Projects are the entry point for runs, comparisons, and console activity in CEMI.",
      },
    },
  ];

  if (!hasProjects) {
    steps.push({
      popover: {
        title: "No Projects Yet",
        description: "Once a project appears here, you can restart the tour and continue through the rest of CEMI.",
      },
    });
    return steps;
  }

  steps.push({
    element: CEMI_TOUR_SELECTORS.workspaceProjectRowFirst,
    popover: {
      title: "Open a Project",
      description: "We will open the first available project so you can see the rest of the CEMI workflow.",
      onNextClick: async (_element, _step, { driver: driverObj }) => {
        const firstProject = options.getProjects()[0];
        if (!firstProject) {
          driverObj.moveNext();
          return;
        }

        options.openProject(firstProject.id);
        await waitForSelector(CEMI_TOUR_SELECTORS.projectTabs);
        driverObj.moveNext();
      },
    },
  });

  return steps;
}

function buildProjectSteps(options: CemiTourControllerOptions): DriveStep[] {
  const runCount = options.getRuns().length;
  const hasRuns = runCount > 0;
  const hasAtLeastTwoRuns = runCount > 1;
  const steps: DriveStep[] = [
    {
      element: CEMI_TOUR_SELECTORS.projectTabs,
      popover: {
        title: "Project Navigation",
        description: "These tabs let you move between the main project surfaces in CEMI.",
        onPrevClick: async (_element, _step, { driver: driverObj }) => {
          await navigateAndWait("/workspace", CEMI_TOUR_SELECTORS.workspaceProjectRowFirst, options.navigate);
          driverObj.movePrevious();
        },
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.tabRuns,
      popover: {
        title: "Runs",
        description: "Runs are where execution records, statuses, metrics, and artifacts are tracked.",
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.tabCompare,
      popover: {
        title: "Compare",
        description: "Compare helps you evaluate tradeoffs and choose the strongest candidate for your goal.",
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.tabConsole,
      popover: {
        title: "Console",
        description: "Console gives you a direct stream of Writer action events across the project.",
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.runsTable,
      popover: {
        title: "Run Records",
        description: hasRuns
          ? "This surface shows the runs in the current project and lets you choose which ones to compare."
          : "This surface will show runs once CEMI starts recording them for the current project.",
      },
    },
  ];

  if (hasRuns) {
    steps.push({
      element: CEMI_TOUR_SELECTORS.runCompareToggleFirst,
      popover: {
        title: "Select the First Run",
        description: "Start building your comparison set by selecting the first run you want to analyze.",
        onNextClick: async (_element, _step, { driver: driverObj }) => {
          ensureCompareSelected(CEMI_TOUR_SELECTORS.runCompareToggleFirst);
          driverObj.moveNext();
        },
      },
    });

    if (hasAtLeastTwoRuns) {
      steps.push({
        element: CEMI_TOUR_SELECTORS.runCompareToggleSecond,
        popover: {
          title: "Select the Second Run",
          description: "Choose a second run so Compare can evaluate tradeoffs side by side.",
          onNextClick: async (_element, _step, { driver: driverObj }) => {
            ensureCompareSelected(CEMI_TOUR_SELECTORS.runCompareToggleSecond);
            driverObj.moveNext();
          },
        },
      });
    }

    steps.push({
      element: CEMI_TOUR_SELECTORS.tabCompare,
      popover: {
        title: "Open Compare",
        description: hasAtLeastTwoRuns
          ? "With two runs selected, open Compare to inspect them side by side."
          : "Open Compare to inspect the selected run and get ready for side-by-side analysis later.",
        onNextClick: async (_element, _step, { driver: driverObj }) => {
          await navigateAndWait("/workspace/compare", CEMI_TOUR_SELECTORS.compareMainPanel, options.navigate);
          driverObj.moveNext();
        },
      },
    });
  } else {
    steps.push({
      element: CEMI_TOUR_SELECTORS.runsTable,
      popover: {
        title: "Compare Will Appear Here Next",
        description: "Even without runs yet, CEMI keeps the Compare flow ready for later analysis.",
        onNextClick: async (_element, _step, { driver: driverObj }) => {
          await navigateAndWait("/workspace/compare", CEMI_TOUR_SELECTORS.compareMainPanel, options.navigate);
          driverObj.moveNext();
        },
      },
    });
  }

  steps.push(
    {
      element: CEMI_TOUR_SELECTORS.compareMainPanel,
      popover: {
        title: "Compare Setup",
        description: "Use Compare to define the setup and prepare the runs you want to evaluate against each other.",
        onPrevClick: async (_element, _step, { driver: driverObj }) => {
          const previousSelector = hasRuns ? CEMI_TOUR_SELECTORS.tabCompare : CEMI_TOUR_SELECTORS.runsTable;
          await navigateAndWait("/workspace/runs", previousSelector, options.navigate);
          driverObj.movePrevious();
        },
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.compareSidebarPanel,
      popover: {
        title: "Compare Analysis",
        description: "This panel helps you inspect tradeoffs, candidate performance, and decision-making context.",
        onNextClick: async (_element, _step, { driver: driverObj }) => {
          await navigateAndWait("/workspace/console", CEMI_TOUR_SELECTORS.consolePanel, options.navigate);
          driverObj.moveNext();
        },
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.consolePanel,
      popover: {
        title: "Console",
        description: "The Console shows action events emitted directly by the CEMI Writer and runtime surfaces.",
        onPrevClick: async (_element, _step, { driver: driverObj }) => {
          await navigateAndWait("/workspace/compare", CEMI_TOUR_SELECTORS.compareSidebarPanel, options.navigate);
          driverObj.movePrevious();
        },
      },
    },
    {
      element: CEMI_TOUR_SELECTORS.consoleFeed,
      popover: {
        title: "Action Events",
        description: "Each line maps to an explicit Writer action, so you can trace what CEMI did over time.",
      },
    },
    {
      popover: {
        title: "Tour Complete",
        description: "You have seen the core CEMI workflow. You can reopen the help bubble any time to revisit this walkthrough.",
      },
    },
  );

  return steps;
}

export function createCemiTourController(options: CemiTourControllerOptions) {
  const driverObj = driver({
    animate: true,
    allowClose: true,
    smoothScroll: true,
    overlayOpacity: 0.32,
    stagePadding: 8,
    stageRadius: 12,
    showProgress: true,
    progressText: "{{current}} of {{total}}",
    popoverClass: "cemi-tour-popover",
    showButtons: ["previous", "next", "close"],
    prevBtnText: "Back",
    nextBtnText: "Next",
    doneBtnText: "Done",
  });

  return {
    start() {
      driverObj.destroy();
      driverObj.setSteps([
        ...buildWorkspaceSteps(options),
        ...buildProjectSteps(options),
      ]);
      driverObj.drive();
    },
    destroy() {
      driverObj.destroy();
    },
    refresh() {
      if (driverObj.isActive()) {
        driverObj.refresh();
      }
    },
  };
}
