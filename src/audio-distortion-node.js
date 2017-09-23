function audioDistortionNode(ctx) {

    this.ctx = ctx;
    this.distortion;
    this.amount = 400;

    this.getDistortionNode = function (amount) {

        if (amount) {
            this.amount = amount;
        }

        this.distortion = this.ctx.createWaveShaper();
        this.distortion.oversample = '4x';
        this.distortion.curve = this.makeDistortionCurve(this.amount);
        return this.distortion;
    }

    this.makeDistortionCurve = function (amount) {
        var k = typeof amount === 'number' ? amount : 50,
                n_samples = 44100,
                curve = new Float32Array(n_samples),
                deg = Math.PI / 180,
                i = 0,
                x;
        for (; i < n_samples; ++i) {
            x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;

    };
}

module.exports = audioDistortionNode;