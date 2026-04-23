<template>
  <div class="review-and-submit">
    <div class="row">
      <q-card class="choices-card">
        <div class="row odd choices">
          <div class="title">Pollutant</div>
          <div>{{ this.pollutantFriendlyName }}</div>
        </div>
        <div class="row even choices">
          <div class="title">Pre-Policy</div>
          <div class="prePolicyList">{{ this.prePolicyAirQualityName }}</div>
        </div>
        <div class="row odd choices">
          <div class="title">Post-Policy</div>
          <div> 
            <li class="postPolicyList" v-for="postPolicy in this.postPolicyAirQualityName" :key=postPolicy.name>
              {{ postPolicy.name }} <br> &emsp;
              Population year(s): {{ postPolicy.years.toString().replaceAll(",", ", ") }}
            </li>
          </div>
        </div>
        <div class="row even choices">
          <div class="title">Population Dataset</div>
          <div>{{ this.populationDatasetName }}</div>
        </div>
        <div class="row odd choices">
          <div class="title">Exposure Function Group</div>
          <div>{{ this.exposureFunctionGroups }}</div>
        </div>
        <div class="row even choices">
          <div class="title">Reference Population</div>
          <div>Total US Population</div>
        </div>
        <!-- <div class="row even choices">
          <div class="title">Exposure Metric</div>
          <div>{{  }}</div
        </div>
        <div class="row odd choices">
          <div class="title">Exposures Measures</div>
          <div>{{  }}</div>
        </div> -->
      </q-card>
    </div>
  </div>

  <div class="row">
    <div class="col-3">
      <q-form @submit="submitTask()" class="q-gutter-md">
        <q-input
          outlined
          dense
          v-model="taskName"
          label="Enter Task Name"
          hint=""
          lazy-rules="ondemand"
          :rules="[(val) => (val && val.length > 0) || 'Please enter a Task Name']"
        />
      </q-form>
    </div>
    <div class="col-2">
      <div class="save-template-button">
        <q-btn
          :disabled="taskName.trim() == ''"
          color="primary"
          label="Check Result"
          @click="submitTask()"
        />
      </div>
    </div>
  </div>
  <div class="row enter-template-row">
    <div class="col-3">
      <q-form @submit="submitTemplate()" class="q-gutter-md">
        <q-input
          outlined
          dense
          v-model="templateName"
          label="Enter Template Name"
          hint=""
          lazy-rules="ondemand"
          :rules="[(val) => (val && val.length > 0) || 'Please enter a Template Name']"
        />
      </q-form>
    </div>
    <div class="col-2">
      <div class="save-template-button">
        <q-btn
          :disabled="templateName.trim() == ''"
          color="primary"
          label="Save Template"
          @click="submitTemplate()"
        />
      </div>
    </div>

    <q-card-section class="error-card" v-if="this.errorMessage != ''">
      {{ this.errorMessage }}
    </q-card-section>
  </div>

</template>

<script>
import { defineComponent } from "vue";
import { ref, onBeforeMount, onMounted, watch } from "vue";
import { useStore } from "vuex";
import { useQuasar } from "quasar";

import { createExposureTemplate, saveTemplate } from "../../composables/templates/templates";
import { buildExposureBatchTask, submitExposureSyncAnalysis } from "../../composables/exposure/exposure-task";
// Results are shown on a dedicated page after sync run

export default defineComponent({
  model: ref(null),
  name: "ReadyToSubmit",

  setup(props) {
    const store = useStore();

    const $q = useQuasar();

    const pollutantValue = ref(null);
    const options = ref([]);

    const pollutantId = store.state.exposure.pollutantId;
    const pollutantFriendlyName = store.state.exposure.pollutantFriendlyName;
    const prePolicyAirQualityId = store.state.exposure.prePolicyAirQualityId;
    const prePolicyAirQualityName = store.state.exposure.prePolicyAirQualityName;
    const postPolicyAirQualityId = store.state.exposure.postPolicyAirQualityId;
    const postPolicyAirQualityName = store.state.exposure.postPolicyAirQualityName;

    const populationDatasetId = store.state.exposure.populationDatasetId;
    const populationDatasetName = store.state.exposure.populationDatasetName;
    const exposureFunctionGroups = store.state.exposure.exposureFunctionGroupName;

    const taskName = ref("");
    const templateName = ref("");
    const errorMessage = ref("");

    var batchTaskId = null;

    watch(
      () => batchTaskId,
      (currentBatchTaskId, prevBatchTaskId) => {
        if (currentBatchTaskId != prevBatchTaskId) {
          // console.log("yes... " + currentBatchTaskId);
        }
      }
    );

    function submitTemplate() {

      var template = createExposureTemplate(taskName.value, store);

      const templateNotification = $q.notify({
        group: false, // required to be updateable
        timeout: 0, // we want to be in control when it gets dismissed
        spinner: true,
        position: "top",
        message: "Saving Template...",
      });

      (async () => {
        const response = await saveTemplate(
          templateName.value,
          "Exposure Analysis",
          template,
          store,
          templateNotification
        ).fetch();

        templateName.value = "";
      })();
    }


    async function submitTask() {
      // "Check Result": run sync exposure analysis and show results immediately.
      // Current sync endpoint supports ONE scenario + ONE population year.
      const scenarios = store.state.exposure.postPolicyAirQualityId || [];
      const scenarioNames = store.state.exposure.postPolicyAirQualityName || [];

      if (!scenarios.length || !scenarioNames.length) {
        alert("Please select a post-policy air quality surface and year(s) first.");
        return;
      }

      const aqScenarioId = scenarios[0];
      const years = scenarioNames[0]?.years || [];
      const popYear = years[0];

      let warning = "";
      if (scenarios.length > 1 || scenarioNames.some((s) => (s?.years || []).length > 1)) {
        warning =
          "Multiple scenarios/years selected. Sync 'Check Result' is running only the first scenario and first year.";
      }

      // Flatten exposure functions from the batch config we already build via /batch-task-config
      const batch = store.state.exposure.batchTaskObject;
      const exposureGroups = batch?.batchExposureGroups || [];
      const exposureFunctions = [];
      exposureGroups.forEach((g) => {
        (g.exposureConfigs || []).forEach((c) => {
          exposureFunctions.push({
            efId: c.efId ?? c.ef_id ?? c.id,
            efInstanceId: c.efInstanceId ?? c.ef_instance_id ?? c.efInstance ?? c.efInstanceID ?? c.ef_instanceId ?? c.efInstanceId,
          });
        });
      });

      // Fallback: if batch config isn't present, we can't know which functions were selected
      if (!exposureFunctions.length) {
        alert("Exposure functions not loaded yet. Please go back and reselect function group, then try again.");
        return;
      }

      const exposureTaskConfig = {
        name: taskName.value || "Exposure analysis",
        aqBaselineId: store.state.exposure.prePolicyAirQualityId,
        aqScenarioId,
        popId: store.state.exposure.populationDatasetId,
        popYear,
        exposureFunctions,
      };

      const res = await submitExposureSyncAnalysis(exposureTaskConfig, store, { page: 1, rowsPerPage: 50 }).fetch();
      const payload = res?.data?.value || res?.data || {};

      if (!payload || payload.message) {
        alert(payload?.message || "Unable to run sync exposure analysis.");
        return;
      }

      // Navigate to results page with the same style as DataCenter ViewTaskResults
      this.$router.push({
        path: `/exposure/view-result/${payload.resultDatasetId}`,
        query: {
          taskUuid: payload.taskUuid,
          elapsedMs: String(payload.elapsedMs ?? ""),
          warning,
        },
      });
    }

    onBeforeMount(() => {

      (async () => {
        const response = await buildExposureBatchTask(store).fetch(store);
      })();

    })();

    return {
      pollutantId,
      pollutantFriendlyName,
      prePolicyAirQualityId,
      prePolicyAirQualityName,
      postPolicyAirQualityId,
      postPolicyAirQualityName,
      exposureFunctionGroups,
      populationDatasetId,
      populationDatasetName,
      submitTask,
      submitTemplate,
      saveTemplate,
      taskName,
      templateName,
      errorMessage,
    };
  },
});
</script>

<style lang="scss" scoped>
.save-template-button,
.submit-task-button {
  margin-left: 25px;
  padding-top: 2px;
}

.back-to-exposure-button {
  margin-left: 0px;
  padding-top: 0px;
  padding-bottom: 25px;
}

.enter-template-row {
  margin-top: 10px;
}
.choices-card {
  width: 700px;
  margin-bottom: 50px;
}

.choices {
  max-width: 700px;
  padding: 5px;
}

.title {
  width: 200px;
  font-weight: bold;
}

.value {
  width: 450px;
}

.even {
  background-color: #eee;
}

.postPolicyList {
  list-style-type: none;
  overflow-wrap: break-word;
}

.prePolicyList {
  list-style-type: none;
  overflow-wrap: break-word;
  float: right;
}

</style>
