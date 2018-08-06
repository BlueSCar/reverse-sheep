<template>
  <b-container>
    <div v-if='showChallenges'>
      <h3 class='justify-content-center'>
        {{user.username}}
        <small class="text-muted">Week {{week}}</small>
      </h3>
      <b-form class='challenge-form' @submit="submitResponses">
        <challenge-edit class='challenge-edit' v-for="challenge in challenges" v-bind:key="challenge.id" :challenge="challenge">
        </challenge-edit>
        <b-row v-if='submitted'>
          <b-col></b-col>
          <b-alert variant="success" show>Responses saved successfully!</b-alert>
          <b-col></b-col>
        </b-row>
        <b-row>
          <b-col></b-col>
          <button class="btn btn-primary" type="submit">Submit</button>
          <b-col></b-col>
        </b-row>
      </b-form>
    </div>
    <div v-else>
      <h3 class='justify-content-center'>
        {{user.username}}
      </h3>
      <b-alert show>No challenges submitted yet for this week. Please check back later.</b-alert>
    </div>
  </b-container>
</template>

<script>
  import ChallengeEdit from "./ChallengeEdit";

  export default {
    components: {
      "challenge-edit": ChallengeEdit
    },
    computed: {
        showChallenges: function () {
            return this.challenges && this.challenges.length > 0;
        }
    },
    data() {
      return {
        user: {
          id: null,
          username: null
        },
        week: null,
        roundId: null,
        challenges: null,
        submitted: false
      }
    },
    created() {
      this.$http.get('/api/challenges').then((response) => {
        this.user = response.data.user;
        this.week = response.data.week;
        this.roundId = response.data.roundId;
        this.challenges = response.data.challenges;
      }).catch(err => {
        console.error(err);
      });
    },
    methods: {
      submitResponses: function (ev) {
        ev.preventDefault();

        this.$http.post('/api/responses', {
          responses: this.challenges.map(c => {
            return {
              id: c.id,
              responseId: c.userResponse.id
            }
          })
        }).then(res => {
          this.submitted = true;
        }).catch(err => {
          console.err(err);
        });
      }
    }
  }
</script>

<style lang="scss">
  .challenge-edit {
    margin-top: 15px;
    margin-bottom: 15px;
  }
</style>
